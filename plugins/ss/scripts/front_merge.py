#!/usr/bin/env python3
"""Plan the merge of a Docs outage back into a doc front's Now tab.

Three versions of the Now tab go in: BASE (the outage's BASE.md, the tab as last
read before the outage; its `<!-- ss outage ... -->` first line is dropped), OURS
(the outage's NOW.md) and THEIRS (the doc's Now tab as read now, saved to a file).
Each splits into a preamble (the h1 and the State line, shown as section
`(preamble)`) and its `## ` sections. Each section is compared three ways on text
with trailing spaces and edge blank lines stripped. `Repos` and `Work sessions`
compare row by row, keyed on the first cell. `Merge authorizations` compares its
bullets as sets, and any doc side change to it is a question for Athena (`ask`),
because an authorization counts only from her own turn in the chat.

The script writes nothing. It prints the plan, and the orchestrator applies it.

Output (one JSON object on stdout):
  {"items": [{"section", "row" (tables only), "take": "same|ours|theirs|conflict|ask",
              "base", "ours", "theirs",
              "ours_added", "ours_removed", "theirs_added", "theirs_removed"
              (Merge authorizations only)}],
   "conflicts": <count of conflict and ask items>,
   "log_append": "Written during the Docs outage, <start> to <end>\\n<log lines>" | null,
   "notes": [{"title", "path"}]}
  Exit 2 with {"error": ...} on a usage error or a file it cannot read.

Usage:
  python3 front_merge.py BASE OURS THEIRS [--log OUTAGE_LOG --start ISO --end ISO]
                         [--notes NOTES_DIR]
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

PREAMBLE = "(preamble)"
TABLE_SECTIONS = ("Repos", "Work sessions")
AUTH_SECTION = "Merge authorizations"
META_RE = re.compile(r"^<!-- ss outage\b.*-->\s*$")
SEPARATOR_RE = re.compile(r"^[\s|:-]*$")
BULLET_RE = re.compile(r"^\s*[-*+]\s+")


class UsageError(Exception):
    """A bad argument or an unreadable file: exit 2."""


def read_text(path: str, what: str) -> str:
    try:
        return Path(path).read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError) as exc:
        raise UsageError(f"cannot read {what} {path!r}: {exc}") from exc


def strip_meta(text: str) -> str:
    """Drop the `<!-- ss outage ... -->` first line of BASE.md when present."""
    first, sep, rest = text.partition("\n")
    return rest if META_RE.match(first) else text


def normalize(text: str | None) -> str | None:
    if text is None:
        return None
    lines = [line.rstrip() for line in text.splitlines()]
    while lines and not lines[0]:
        lines.pop(0)
    while lines and not lines[-1]:
        lines.pop()
    return "\n".join(lines)


def split_sections(text: str) -> tuple[str, dict[str, str], list[str]]:
    """Return (preamble, {heading: body}, headings in order)."""
    preamble: list[str] = []
    bodies: dict[str, list[str]] = {}
    order: list[str] = []
    current: list[str] = preamble
    for line in text.splitlines():
        if line.startswith("## "):
            heading = line[3:].strip()
            if heading not in bodies:
                bodies[heading] = []
                order.append(heading)
            current = bodies[heading]
            continue
        current.append(line)
    return "\n".join(preamble), {h: "\n".join(b) for h, b in bodies.items()}, order


def three_way(base: str | None, ours: str | None, theirs: str | None) -> str:
    if ours == base and theirs == base:
        return "same"
    if theirs == base:
        return "ours"
    if ours == base:
        return "theirs"
    if ours == theirs:
        return "same"
    return "conflict"


def first_cell(row: str) -> str:
    cells = row.strip().split("|")
    return cells[1].strip() if len(cells) > 1 else ""


def split_table(body: str) -> tuple[dict[str, str], list[str], str]:
    """Return ({row key: row}, keys in order, the section's non-table text)."""
    rows: dict[str, str] = {}
    order: list[str] = []
    other: list[str] = []
    seen_header = False
    for line in body.splitlines():
        if not line.lstrip().startswith("|"):
            other.append(line)
            continue
        if not seen_header:
            seen_header = True
            continue
        if SEPARATOR_RE.match(line):
            continue
        key = first_cell(line)
        row = line.rstrip()
        if key in rows:
            rows[key] += "\n" + row
        else:
            rows[key] = row
            order.append(key)
    return rows, order, "\n".join(other)


def merge_table(section: str, base: str, ours: str, theirs: str) -> list[dict]:
    sides = [split_table(base), split_table(ours), split_table(theirs)]
    keys: list[str] = []
    for _, order, _ in sides:
        keys.extend(k for k in order if k not in keys)
    items = []
    for key in keys:
        b, o, t = (side[0].get(key) for side in sides)
        items.append({"section": section, "row": key, "take": three_way(b, o, t),
                      "base": b, "ours": o, "theirs": t})
    b, o, t = (normalize(side[2]) for side in sides)
    if b or o or t:
        items.append({"section": section, "row": None, "take": three_way(b, o, t),
                      "base": b, "ours": o, "theirs": t})
    return items


def bullets(text: str) -> list[str]:
    out: list[str] = []
    for line in text.splitlines():
        line = line.strip()
        if BULLET_RE.match(line) and line not in out:
            out.append(line)
    return out


def merge_authorizations(base: str, ours: str, theirs: str) -> dict:
    b, o, t = bullets(base), bullets(ours), bullets(theirs)
    ours_added = [x for x in o if x not in b]
    ours_removed = [x for x in b if x not in o]
    theirs_added = [x for x in t if x not in b]
    theirs_removed = [x for x in b if x not in t]
    if theirs_added or theirs_removed:
        take = "ask"
    elif ours_added or ours_removed:
        take = "ours"
    else:
        take = "same"
    return {
        "section": AUTH_SECTION, "take": take,
        "base": base, "ours": ours, "theirs": theirs,
        "ours_added": ours_added, "ours_removed": ours_removed,
        "theirs_added": theirs_added, "theirs_removed": theirs_removed,
    }


def plan(base_text: str, ours_text: str, theirs_text: str) -> list[dict]:
    parts = [split_sections(strip_meta(base_text)), split_sections(ours_text),
             split_sections(theirs_text)]
    items: list[dict] = []
    pre = [normalize(p[0]) for p in parts]
    items.append({"section": PREAMBLE, "take": three_way(*pre),
                  "base": pre[0], "ours": pre[1], "theirs": pre[2]})
    headings: list[str] = []
    for _, _, order in parts:
        headings.extend(h for h in order if h not in headings)
    for heading in headings:
        b, o, t = (normalize(p[1].get(heading, "")) for p in parts)
        if heading in TABLE_SECTIONS:
            items.extend(merge_table(heading, b, o, t))
        elif heading == AUTH_SECTION:
            items.append(merge_authorizations(b, o, t))
        else:
            items.append({"section": heading, "take": three_way(b, o, t),
                          "base": b, "ours": o, "theirs": t})
    return items


def log_append(log_path: str | None, start: str | None, end: str | None) -> str | None:
    if not log_path:
        return None
    text = normalize(read_text(log_path, "the outage log"))
    if not text:
        return None
    return f"Written during the Docs outage, {start} to {end}\n{text}"


def list_notes(notes_dir: str | None) -> list[dict]:
    if not notes_dir:
        return []
    folder = Path(notes_dir)
    if not folder.is_dir():
        raise UsageError(f"cannot read the notes folder {notes_dir!r}")
    files = sorted((p for p in folder.iterdir() if p.is_file()), key=lambda p: p.name)
    return [{"title": p.stem, "path": str(p.resolve())} for p in files]


class JsonArgumentParser(argparse.ArgumentParser):
    # The caller parses stdout as JSON, so a usage error has to be JSON too.
    def error(self, message):
        print(json.dumps({"error": message}))
        sys.exit(2)


def main(argv: list[str] | None = None) -> int:
    parser = JsonArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("base", help="the outage BASE.md")
    parser.add_argument("ours", help="the outage NOW.md")
    parser.add_argument("theirs", help="the doc's Now tab as read now, saved to a file")
    parser.add_argument("--log", help="the outage LOG.md")
    parser.add_argument("--start", help="when the outage started (ISO)")
    parser.add_argument("--end", help="when the outage ended (ISO)")
    parser.add_argument("--notes", help="the outage notes/ folder")
    args = parser.parse_args(argv)
    if args.log and not (args.start and args.end):
        parser.error("--log needs --start and --end")
    try:
        items = plan(
            read_text(args.base, "BASE"),
            read_text(args.ours, "OURS"),
            read_text(args.theirs, "THEIRS"),
        )
        out = {
            "items": items,
            "conflicts": sum(1 for i in items if i["take"] in ("conflict", "ask")),
            "log_append": log_append(args.log, args.start, args.end),
            "notes": list_notes(args.notes),
        }
    except UsageError as exc:
        print(json.dumps({"error": str(exc)}))
        return 2
    print(json.dumps(out))
    return 0


if __name__ == "__main__":
    sys.exit(main())
