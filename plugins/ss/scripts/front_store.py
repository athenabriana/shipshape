#!/usr/bin/env python3
"""Keep the local folders of fronts: file fronts and Docs outages.

A file front lives in `SS_HOME/fronts/<slug>/` with `NOW.md`, `LOG.md` and
`notes/`. A doc front whose Docs tools fail writes to `SS_HOME/outage/<slug>/`
with `BASE.md`, `NOW.md`, `LOG.md` and `notes/`, and once merged back that folder
is renamed `<slug>.merged-<YYYY-MM-DD>`. Nothing here deletes a folder. `SS_HOME`
comes from the environment and defaults to `~/.ss`. Dates are UTC.

Output (one JSON object on stdout):
  create:        {"slug", "path", "now", "log", "notes"} (absolute paths)
  exists:        {"slug", "file_front", "outage", "exists"}
  list:          {"fronts": [{"slug", "kind": "file", "state", "path"} |
                 {"slug", "kind": "outage", "state": "outage", "since",
                 "base_rev", "path"}]}
  land:          {"slug", "path", "state", "changed"}
  outage-init:   {"slug", "path", "base_rev", "since"}
  outage-close:  {"slug", "from", "to"}
  Exit 1 with {"error": ...} when the store refuses, exit 2 with {"error": ...}
  on a usage error.

Usage:
  python3 front_store.py create <slug> [--orchestrator ID]
  python3 front_store.py exists <slug>
  python3 front_store.py list [--all]
  python3 front_store.py land <slug>
  python3 front_store.py outage-init <slug> <base-file> <rev> [--since ISO]
  python3 front_store.py outage-close <slug>
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

SLUG_RE = re.compile(r"^[a-z0-9][a-z0-9-]*$")
REV_RE = re.compile(r"^\d+$")
SINCE_RE = re.compile(r"^[0-9A-Za-z:.+-]+$")
META_RE = re.compile(r"^<!-- ss outage · base rev (?P<rev>\S+) · since (?P<since>\S+) -->$")
STATE_PREFIX = "State: "
SEP = " · "

NOW_TEMPLATE = """\
# ss front · {slug}

State: open · orchestrator {orchestrator} · opened {date}

## Goal

<one paragraph, Athena's words>

## Acceptance criteria

- WHEN <...> THEN <...>

## Out of scope

- <a hard line, or an idea parked for later>

## Repos

| repo | base | branch | PR | CI |
| ---- | ---- | ------ | -- | -- |

## Work sessions

| name | session id | task | state | last report (one line) |
| ---- | ---------- | ---- | ----- | ---------------------- |

## Waiting on Athena

## Merge authorizations

## Next
"""


class StoreError(Exception):
    """A refusal: exit 1."""


class UsageError(Exception):
    """A bad argument: exit 2."""


def render_now(slug: str, orchestrator: str, date: str) -> str:
    return NOW_TEMPLATE.format(slug=slug, orchestrator=orchestrator, date=date)


def ss_home() -> Path:
    return Path(os.environ.get("SS_HOME") or "~/.ss").expanduser()


def today() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def check_slug(slug: str) -> str:
    if not SLUG_RE.match(slug):
        raise UsageError(f"bad slug {slug!r}: expected [a-z0-9][a-z0-9-]*")
    return slug


def state_line(text: str) -> tuple[int, str] | None:
    """Return (line index, text after `State: `) of the first State line."""
    for i, line in enumerate(text.splitlines()):
        if line.startswith(STATE_PREFIX):
            return i, line[len(STATE_PREFIX):].strip()
    return None


def read_meta(base_md: Path) -> tuple[str | None, int | str | None]:
    """Read (since, base_rev) from the first line of an outage's BASE.md."""
    try:
        with base_md.open(encoding="utf-8") as fh:
            first = fh.readline().strip()
    except OSError:
        return None, None
    match = META_RE.match(first)
    if not match:
        return None, None
    rev = match.group("rev")
    return match.group("since"), int(rev) if rev.isdigit() else rev


def cmd_create(home: Path, slug: str, orchestrator: str) -> dict:
    front = home / "fronts" / slug
    if front.exists():
        raise StoreError(f"a file front {slug!r} already exists at {front}")
    if (home / "outage" / slug).exists():
        raise StoreError(f"an outage folder for {slug!r} exists; the slug belongs to a doc front")
    single_line(orchestrator, "the orchestrator id")
    (front / "notes").mkdir(parents=True)
    now, log = front / "NOW.md", front / "LOG.md"
    now.write_text(render_now(slug, orchestrator, today()), encoding="utf-8")
    log.write_text(f"# ss front · {slug} · log\n", encoding="utf-8")
    return {
        "slug": slug,
        "path": str(front.resolve()),
        "now": str(now.resolve()),
        "log": str(log.resolve()),
        "notes": str((front / "notes").resolve()),
    }


def cmd_exists(home: Path, slug: str) -> dict:
    file_front = (home / "fronts" / slug).is_dir()
    outage = (home / "outage" / slug).is_dir()
    return {"slug": slug, "file_front": file_front, "outage": outage, "exists": file_front or outage}


def cmd_list(home: Path, show_all: bool) -> dict:
    fronts: list[dict] = []
    fronts_dir, outage_dir = home / "fronts", home / "outage"
    if fronts_dir.is_dir():
        for now in fronts_dir.glob("*/NOW.md"):
            try:
                found = state_line(now.read_text(encoding="utf-8"))
            except OSError:
                continue
            state = found[1] if found else ""
            if state.startswith("landed") and not show_all:
                continue
            fronts.append(
                {"slug": now.parent.name, "kind": "file", "state": state,
                 "path": str(now.parent.resolve())}
            )
    if outage_dir.is_dir():
        for folder in outage_dir.iterdir():
            if not folder.is_dir() or ".merged-" in folder.name:
                continue
            since, rev = read_meta(folder / "BASE.md")
            fronts.append(
                {"slug": folder.name, "kind": "outage", "state": "outage", "since": since,
                 "base_rev": rev, "path": str(folder.resolve())}
            )
    fronts.sort(key=lambda f: (f["slug"], f["kind"]))
    return {"fronts": fronts}


def cmd_land(home: Path, slug: str) -> dict:
    now = home / "fronts" / slug / "NOW.md"
    if not now.is_file():
        raise StoreError(f"no file front {slug!r}")
    text = now.read_text(encoding="utf-8")
    found = state_line(text)
    if found is None:
        raise StoreError(f"{now} has no `State:` line")
    index, state = found
    parts = state.split(SEP)
    if parts[0].strip() == "landed":
        return {"slug": slug, "path": str(now.resolve()), "state": state, "changed": False}
    parts[0] = "landed"
    parts.append(f"landed {today()}")
    new_state = SEP.join(parts)
    lines = text.splitlines(keepends=True)
    ending = "\n" if lines[index].endswith("\n") else ""
    lines[index] = STATE_PREFIX + new_state + ending
    now.write_text("".join(lines), encoding="utf-8")
    return {"slug": slug, "path": str(now.resolve()), "state": new_state, "changed": True}


def single_line(value: str, what: str) -> str:
    if not value or "\n" in value or "\r" in value:
        raise UsageError(f"{what} must be one non-empty line")
    return value


def cmd_outage_init(home: Path, slug: str, base_file: str, rev: str, since: str | None) -> dict:
    if not REV_RE.match(rev):
        raise UsageError(f"bad rev {rev!r}: expected a number")
    since = since or now_iso()
    if not SINCE_RE.match(since):
        raise UsageError(f"bad --since {since!r}: expected an ISO time")
    if (home / "fronts" / slug).exists():
        raise StoreError(f"{slug!r} is a file front, and a file front never has an outage")
    folder = home / "outage" / slug
    if folder.exists():
        raise StoreError(f"an outage folder for {slug!r} already exists at {folder}")
    try:
        content = Path(base_file).read_text(encoding="utf-8")
    except OSError as exc:
        raise UsageError(f"cannot read the base file: {exc}") from exc
    (folder / "notes").mkdir(parents=True)
    meta = f"<!-- ss outage · base rev {rev} · since {since} -->"
    (folder / "BASE.md").write_text(meta + "\n" + content, encoding="utf-8")
    (folder / "NOW.md").write_text(content, encoding="utf-8")
    (folder / "LOG.md").write_text("", encoding="utf-8")
    return {"slug": slug, "path": str(folder.resolve()), "base_rev": int(rev), "since": since}


def cmd_outage_close(home: Path, slug: str) -> dict:
    folder = home / "outage" / slug
    if not folder.is_dir():
        raise StoreError(f"no outage folder for {slug!r}")
    stem = f"{slug}.merged-{today()}"
    target = folder.parent / stem
    n = 2
    while target.exists():
        target = folder.parent / f"{stem}-{n}"
        n += 1
    source = str(folder.resolve())
    folder.rename(target)
    return {"slug": slug, "from": source, "to": str(target.resolve())}


class JsonArgumentParser(argparse.ArgumentParser):
    # The caller parses stdout as JSON, so a usage error has to be JSON too.
    def error(self, message):
        print(json.dumps({"error": message}))
        sys.exit(2)


def build_parser() -> JsonArgumentParser:
    parser = JsonArgumentParser(description=__doc__.splitlines()[0])
    sub = parser.add_subparsers(dest="command", required=True)

    p = sub.add_parser("create", help="make a file front")
    p.add_argument("slug")
    p.add_argument("--orchestrator", default="unknown", help="the orchestrator's session id")

    p = sub.add_parser("exists", help="say whether a slug has a local folder")
    p.add_argument("slug")

    p = sub.add_parser("list", help="list file fronts and open outages")
    p.add_argument("--all", action="store_true", help="include landed file fronts")

    p = sub.add_parser("land", help="mark a file front landed")
    p.add_argument("slug")

    p = sub.add_parser("outage-init", help="open the outage folder of a doc front")
    p.add_argument("slug")
    p.add_argument("base_file", help="the Now tab as last read from the doc")
    p.add_argument("rev", help="the doc revision of that read")
    p.add_argument("--since", help="when the outage started (ISO, default now UTC)")

    p = sub.add_parser("outage-close", help="rename a merged outage folder")
    p.add_argument("slug")
    return parser


def run(args: argparse.Namespace) -> dict:
    home = ss_home()
    if args.command == "list":
        return cmd_list(home, args.all)
    slug = check_slug(args.slug)
    if args.command == "create":
        return cmd_create(home, slug, args.orchestrator)
    if args.command == "exists":
        return cmd_exists(home, slug)
    if args.command == "land":
        return cmd_land(home, slug)
    if args.command == "outage-init":
        return cmd_outage_init(home, slug, args.base_file, args.rev, args.since)
    return cmd_outage_close(home, slug)


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        out = run(args)
    except UsageError as exc:
        print(json.dumps({"error": str(exc)}))
        return 2
    except StoreError as exc:
        print(json.dumps({"error": str(exc)}))
        return 1
    except OSError as exc:
        print(json.dumps({"error": f"file system error: {exc}"}))
        return 1
    print(json.dumps(out))
    return 0


if __name__ == "__main__":
    sys.exit(main())
