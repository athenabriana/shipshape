#!/usr/bin/env python3
"""
Build the derived files of the `.ss/wiki/` bundle, or answer which facts cover a list
of files. The bundle's contract is `plugins/ss/references/wiki-state.md`.

`build` (the default) writes `index.md`, `entities/index.md` and the backlinks block on
every entity hub, from the facts and the links in their bodies. Nothing else in the
bundle is touched, so running it twice changes nothing the second time.

`match --files ...` prints the facts whose `paths` match any of the files, as JSON. A
folder among them matches the facts naming any file under it.
`preflight.py` imports `match_facts` for its `wiki` field; the subcommand is how a reader
with no diff yet asks the same question.

Usage:
  python3 build_wiki.py [--wiki .ss/wiki]
  python3 build_wiki.py match --files src/a.py src/b.py [--status current]
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from scan_specs import find_ss_root  # noqa: E402

RESERVED = ("index.md", "entities/index.md", "log.md")
STATUSES = ("current", "proposed", "superseded")
KINDS = ("module", "service", "tool", "concept", "external")
BACKLINKS_START = "<!-- backlinks:start -->"
BACKLINKS_END = "<!-- backlinks:end -->"
RECENT_FACTS = 10

FRONTMATTER = re.compile(r"\A---\r?\n(.*?)\r?\n---\r?\n?", re.DOTALL)
KEY_LINE = re.compile(r"^([A-Za-z_][\w-]*):\s*(.*)$")
LINK = re.compile(r"\]\((/[^)\s#]+\.md)(?:#[^)\s]*)?\)")


DECODER = json.JSONDecoder()


def parse_value(raw: str):
    """The YAML subset the bundle writes: a quoted string, an inline list, or a bare
    scalar with an optional ` #` comment. Quoted values and lists are JSON-compatible by
    the contract, which is why `json` reads them. A quoted value that is not valid JSON
    comes back as the raw text, quotes included, so the validator can name it."""
    raw = raw.strip()
    if raw.startswith(("\"", "[")):
        try:
            value, end = DECODER.raw_decode(raw)
        except ValueError:
            return raw
        # A trailing comment after a closing quote or bracket is legal YAML.
        rest = raw[end:].strip()
        return value if not rest or rest.startswith("#") else raw
    return re.split(r"\s+#", raw, maxsplit=1)[0].strip()


def split_frontmatter(text: str) -> tuple[dict | None, list[tuple[str, str]], str]:
    """(parsed block or None, raw `(key, value)` lines, body)."""
    m = FRONTMATTER.match(text)
    if not m:
        return None, [], text
    raw, data = [], {}
    for line in m.group(1).splitlines():
        km = KEY_LINE.match(line)
        if km:
            raw.append((km.group(1), km.group(2)))
            data[km.group(1)] = parse_value(km.group(2))
    return data, raw, text[m.end():]


def wiki_dir(arg: str | None) -> Path:
    if arg:
        return Path(arg).resolve()
    return find_ss_root(Path.cwd().resolve()) / ".ss" / "wiki"


def rel(wiki: Path, path: Path) -> str:
    return "/" + path.relative_to(wiki).as_posix()


def load(wiki: Path) -> dict:
    """Every non-reserved `.md` of the bundle, keyed by its bundle-absolute path."""
    docs = {}
    for path in sorted(wiki.rglob("*.md")):
        key = rel(wiki, path)
        if key.lstrip("/") in RESERVED:
            continue
        text = path.read_text(encoding="utf-8")
        meta, raw, body = split_frontmatter(text)
        docs[key] = {
            "path": path,
            "key": key,
            "text": text,
            "meta": meta or {},
            "raw": raw,
            "has_frontmatter": meta is not None,
            "body": body,
            "links": sorted(set(LINK.findall(strip_backlinks(body)))),
        }
    return docs


def strip_backlinks(body: str) -> str:
    start, end = body.find(BACKLINKS_START), body.find(BACKLINKS_END)
    if start == -1 or end == -1:
        return body
    return body[:start] + body[end + len(BACKLINKS_END):]


def normalize(pattern: str) -> str:
    pattern = pattern.strip().replace("\\", "/").rstrip("/")
    return pattern[2:] if pattern.startswith("./") else pattern


def glob_regex(pattern: str) -> re.Pattern:
    """Git's pathspec glob: `*` and `?` stay inside one directory, `**` crosses them.
    `fnmatch` lets `*` cross `/`, which is why it is not used. A pattern with no glob
    character also matches everything under it, the way `git ls-files src/auth` does."""
    pattern = normalize(pattern)
    out, i = [], 0
    while i < len(pattern):
        if pattern.startswith("**/", i):
            out.append("(?:.*/)?")
            i += 3
        elif pattern.startswith("**", i):
            out.append(".*")
            i += 2
        elif pattern[i] == "*":
            out.append("[^/]*")
            i += 1
        elif pattern[i] == "?":
            out.append("[^/]")
            i += 1
        else:
            out.append(re.escape(pattern[i]))
            i += 1
    suffix = "(?:/.*)?" if not re.search(r"[*?]", pattern) else ""
    return re.compile("^" + "".join(out) + suffix + "$")


def covers_folder(pattern: str, folder: str) -> bool:
    """Whether a file the pattern names can live under `folder` (written with a trailing
    `/`). Tested on the pattern's literal directory head, since a folder is no file."""
    pattern = normalize(pattern)
    glob = re.search(r"[*?]", pattern)
    if not glob:
        return (pattern + "/").startswith(folder) or folder.startswith(pattern + "/")
    head = pattern[: pattern.rfind("/", 0, glob.start()) + 1]
    # Only `**` reaches below the head; `*` stays in the head's own directory.
    return head.startswith(folder) or ("**" in pattern and folder.startswith(head))


def fact_matches(paths: list, files: list[str]) -> list[str]:
    """The `files` some pattern matches. An entry ending in `/` is a folder, and matches
    a pattern naming any file under it."""
    patterns = [p for p in paths if isinstance(p, str) and p.strip()]
    regexes = [glob_regex(p) for p in patterns]
    out = []
    for f in files:
        f = f.replace("\\", "/")
        if f.endswith("/"):
            hit = any(covers_folder(p, f) for p in patterns)
        else:
            hit = any(r.match(f) for r in regexes)
        if hit:
            out.append(f)
    return out


def facts(docs: dict) -> list[dict]:
    return [d for d in docs.values() if d["meta"].get("type") == "fact"]


def entities(docs: dict) -> list[dict]:
    return [d for d in docs.values() if d["meta"].get("type") == "entity"]


def match_facts(wiki: Path, files: list[str], statuses=("current",)) -> list[dict]:
    """The facts of `statuses` whose `paths` match any of `files`."""
    if not wiki.is_dir():
        return []
    out = []
    for fact in facts(load(wiki)):
        meta = fact["meta"]
        if meta.get("status") not in statuses:
            continue
        hits = fact_matches(meta.get("paths") or [], files)
        if hits:
            out.append(
                {
                    "file": fact["key"],
                    "title": meta.get("title"),
                    "description": meta.get("description"),
                    "status": meta.get("status"),
                    "paths": meta.get("paths"),
                    "matched": hits,
                }
            )
    return out


def status_rank(fact: dict) -> int:
    status = fact["meta"].get("status")
    return STATUSES.index(status) if status in STATUSES else len(STATUSES)


def backlinks_block(hub: dict, all_facts: list[dict]) -> str:
    linking = sorted(
        (f for f in all_facts if hub["key"] in f["links"]),
        key=lambda f: (status_rank(f), f["meta"].get("title") or f["key"]),
    )
    lines = [BACKLINKS_START, "", "## Facts", ""]
    if linking:
        lines += [
            f"- [{f['meta'].get('title') or f['key']}]({f['key']}) ({f['meta'].get('status')})"
            for f in linking
        ]
    else:
        lines.append("No fact links here yet.")
    lines += ["", BACKLINKS_END]
    return "\n".join(lines)


def write_backlinks(hub: dict, all_facts: list[dict]) -> bool:
    text = hub["text"]
    block = backlinks_block(hub, all_facts)
    start, end = text.find(BACKLINKS_START), text.find(BACKLINKS_END)
    if start != -1 and end != -1:
        new = text[:start] + block + text[end + len(BACKLINKS_END):]
    else:
        new = text.rstrip() + "\n\n" + block + "\n"
    return write_if_changed(hub["path"], new)


def entity_catalog(hubs: list[dict]) -> str:
    lines = ["# Entities", ""]
    by_kind: dict[str, list[dict]] = {}
    for hub in hubs:
        by_kind.setdefault(hub["meta"].get("kind") or "unknown", []).append(hub)
    if not by_kind:
        lines.append("No entity yet.")
    for kind in [*KINDS, *sorted(k for k in by_kind if k not in KINDS)]:
        if kind not in by_kind:
            continue
        lines += [f"## {kind}", ""]
        for hub in sorted(by_kind[kind], key=lambda h: h["meta"].get("title") or h["key"]):
            desc = hub["meta"].get("description")
            title = hub["meta"].get("title") or hub["key"]
            lines.append(f"- [{title}]({hub['key']})" + (f": {desc}" if desc else ""))
        lines.append("")
    return "\n".join(lines).rstrip() + "\n"


def router(all_facts: list[dict], hubs: list[dict]) -> str:
    counts = {s: sum(f["meta"].get("status") == s for f in all_facts) for s in STATUSES}
    kinds = sorted({h["meta"].get("kind") or "unknown" for h in hubs})
    lines = [
        "# Wiki",
        "",
        "Derived by `build_wiki.py`. The contract is `plugins/ss/references/wiki-state.md`.",
        "",
        "## Facts",
        "",
        *(f"- {s}: {counts[s]}" for s in STATUSES),
        "",
        "## Entities",
        "",
    ]
    if kinds:
        lines += [
            f"- [{k}](/entities/index.md#{k}): {sum((h['meta'].get('kind') or 'unknown') == k for h in hubs)}"
            for k in kinds
        ]
    else:
        lines.append("No entity yet.")
    lines += ["", "## Recently updated", ""]
    recent = sorted(
        (f for f in all_facts if f["meta"].get("status") != "superseded"),
        key=lambda f: (str(f["meta"].get("updated") or ""), f["key"]),
        reverse=True,
    )[:RECENT_FACTS]
    if recent:
        lines += [
            f"- {f['meta'].get('updated')} [{f['meta'].get('title') or f['key']}]({f['key']}) ({f['meta'].get('status')})"
            for f in recent
        ]
    else:
        lines.append("No fact yet.")
    return "\n".join(lines) + "\n"


def write_if_changed(path: Path, text: str) -> bool:
    if path.is_file() and path.read_text(encoding="utf-8") == text:
        return False
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8", newline="\n")
    return True


def build(wiki: Path) -> dict:
    docs = load(wiki)
    all_facts, hubs = facts(docs), entities(docs)
    written = [rel(wiki, h["path"]) for h in hubs if write_backlinks(h, all_facts)]
    if write_if_changed(wiki / "entities" / "index.md", entity_catalog(hubs)):
        written.append("/entities/index.md")
    if write_if_changed(wiki / "index.md", router(all_facts, hubs)):
        written.append("/index.md")
    return {"wiki": str(wiki), "facts": len(all_facts), "entities": len(hubs), "written": written}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build the .ss/wiki/ derived files, or match facts.")
    parser.add_argument("--wiki", default=None, help="The bundle directory (default: <.ss root>/.ss/wiki).")
    sub = parser.add_subparsers(dest="cmd")
    sub.add_parser("build", help="Write index.md, entities/index.md and the backlinks blocks.")
    m = sub.add_parser("match", help="Print the facts whose paths match the files.")
    m.add_argument("--files", nargs="+", required=True)
    m.add_argument("--status", nargs="+", default=["current"], choices=STATUSES)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    wiki = wiki_dir(args.wiki)
    if args.cmd == "match":
        # A caller names folders as they are; the trailing `/` is what marks one.
        files = [f.rstrip("/\\") + "/" if Path(f).is_dir() else f for f in args.files]
        print(json.dumps(match_facts(wiki, files, tuple(args.status)), indent=2))
        return
    if not wiki.is_dir():
        print(json.dumps({"error": f"No wiki at {wiki}"}))
        sys.exit(1)
    print(json.dumps(build(wiki), indent=2))


if __name__ == "__main__":
    main()
