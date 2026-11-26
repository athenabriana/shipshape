#!/usr/bin/env python3
"""Keep the pointer that finds a session's front again after a compaction.

The pointer is `SS_HOME/front-of/<session id>`, plain `key=value` lines: `slug`,
`home` (`doc` or `file`) and `where`. During a Docs outage it also holds
`state=outage` and `outage=<dir>   # since <ISO>, base rev <N>`. `SS_HOME` comes
from the environment and defaults to `~/.ss`. The session id comes from
`--session`, else from `CLAUDE_CODE_SESSION_ID`.

The pointer holds a location, never the front's state. A front's home is set
once: `set` with another slug or home is refused. Only a doc front has an outage.

Output (one JSON object on stdout):
  set:          {"pointer": {...}}
  get:          {"pointer": null} or {"pointer": {"slug", "home", "where",
                "state", "outage", "since", "base_rev"}}; the last four are
                null outside an outage.
  clear:        {"cleared": true|false}
  outage start: {"pointer": {...}}
  outage end:   {"pointer": {...}}
  Exit 1 with {"error": ...} when the pointer refuses the change (with
  "pointer" when one exists), exit 2 with {"error": ...} on a usage error.

Usage:
  python3 front_pointer.py [--session ID] set <slug> <doc|file> <where>
  python3 front_pointer.py [--session ID] get
  python3 front_pointer.py [--session ID] clear
  python3 front_pointer.py [--session ID] outage start <dir> <base-rev>
  python3 front_pointer.py [--session ID] outage end
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
SESSION_RE = re.compile(r"^[A-Za-z0-9._-]+$")
REV_RE = re.compile(r"^\d+$")
OUTAGE_RE = re.compile(r"^(?P<dir>.*?)\s+#\s*since\s+(?P<since>\S+?)\s*,\s*base rev\s+(?P<rev>\d+)\s*$")
HOMES = ("doc", "file")
KEYS = ("slug", "home", "where", "state", "outage", "since", "base_rev")


class PointerError(Exception):
    """A refusal: exit 1, with the current pointer when there is one."""

    def __init__(self, message: str, pointer: dict | None = None) -> None:
        super().__init__(message)
        self.pointer = pointer


class UsageError(Exception):
    """A bad argument: exit 2."""


def home_dir(value: str | None = None) -> Path:
    return Path(value or os.environ.get("SS_HOME") or "~/.ss").expanduser()


def pointer_path(session_id: str, ss_home_dir: str | Path | None = None) -> Path:
    return home_dir(str(ss_home_dir) if ss_home_dir else None) / "front-of" / session_id


def parse_pointer(text: str) -> dict:
    """Parse pointer text into a dict with every key of KEYS (None when absent)."""
    raw: dict[str, str] = {}
    for line in text.splitlines():
        if "=" not in line or not line.strip():
            continue
        key, value = line.split("=", 1)
        raw[key.strip()] = value.strip()
    pointer: dict = {key: None for key in KEYS}
    for key in ("slug", "home", "where", "state"):
        if raw.get(key):
            pointer[key] = raw[key]
    outage = raw.get("outage")
    if outage:
        match = OUTAGE_RE.match(outage)
        if match:
            pointer["outage"] = match.group("dir").strip()
            pointer["since"] = match.group("since")
            pointer["base_rev"] = int(match.group("rev"))
        else:
            pointer["outage"] = outage.split("#", 1)[0].strip() or None
    return pointer


def in_outage(pointer: dict) -> bool:
    return pointer.get("state") == "outage"


def public(pointer: dict) -> dict:
    """The shape `get` prints: the outage fields are null outside an outage."""
    out = {key: pointer.get(key) for key in KEYS}
    if not in_outage(pointer):
        for key in ("state", "outage", "since", "base_rev"):
            out[key] = None
    return out


def render_pointer(pointer: dict) -> str:
    lines = [f"slug={pointer['slug']}", f"home={pointer['home']}", f"where={pointer['where']}"]
    if in_outage(pointer):
        lines.append("state=outage")
        lines.append(
            f"outage={pointer['outage']}   # since {pointer['since']}, base rev {pointer['base_rev']}"
        )
    return "\n".join(lines) + "\n"


def read_pointer(session_id: str, ss_home: str | Path | None = None) -> dict | None:
    """Return the session's pointer, or None when the id is bad or no pointer exists."""
    if not session_id or not SESSION_RE.match(session_id):
        return None
    path = pointer_path(session_id, ss_home)
    try:
        text = path.read_text(encoding="utf-8")
    except OSError:
        return None
    pointer = parse_pointer(text)
    if not pointer["slug"] or not pointer["home"]:
        return None
    return public(pointer)


def write_pointer(path: Path, pointer: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(render_pointer(pointer), encoding="utf-8")


def single_line(value: str, what: str) -> str:
    if not value or "\n" in value or "\r" in value:
        raise UsageError(f"{what} must be one non-empty line")
    return value


def cmd_set(path: Path, session_id: str, slug: str, home: str, where: str) -> dict:
    if not SLUG_RE.match(slug):
        raise UsageError(f"bad slug {slug!r}: expected [a-z0-9][a-z0-9-]*")
    if home not in HOMES:
        raise UsageError(f"bad home {home!r}: expected doc or file")
    single_line(where, "where")
    current = read_pointer(session_id, path.parent.parent)
    if current is not None:
        if current["slug"] != slug or current["home"] != home:
            raise PointerError(
                "this session already points at another front or home; a front's home is set once",
                current,
            )
        pointer = {**current, "where": where}
    else:
        pointer = {key: None for key in KEYS}
        pointer.update(slug=slug, home=home, where=where)
    write_pointer(path, pointer)
    return {"pointer": public(pointer)}


def cmd_outage_start(path: Path, session_id: str, outage_dir: str, base_rev: str) -> dict:
    single_line(outage_dir, "the outage dir")
    if not REV_RE.match(base_rev):
        raise UsageError(f"bad base rev {base_rev!r}: expected a number")
    current = read_pointer(session_id, path.parent.parent)
    if current is None:
        raise PointerError("no pointer for this session")
    if current["home"] != "doc":
        raise PointerError("only a doc front has a Docs outage", current)
    if in_outage(current):
        raise PointerError("the front is already in an outage", current)
    since = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    pointer = {**current, "state": "outage", "outage": outage_dir, "since": since,
               "base_rev": int(base_rev)}
    write_pointer(path, pointer)
    return {"pointer": public(pointer)}


def cmd_outage_end(path: Path, session_id: str) -> dict:
    current = read_pointer(session_id, path.parent.parent)
    if current is None:
        raise PointerError("no pointer for this session")
    if not in_outage(current):
        raise PointerError("the front is not in an outage", current)
    pointer = {**current, "state": None, "outage": None, "since": None, "base_rev": None}
    write_pointer(path, pointer)
    return {"pointer": public(pointer)}


class JsonArgumentParser(argparse.ArgumentParser):
    # The caller parses stdout as JSON, so a usage error has to be JSON too.
    def error(self, message):
        print(json.dumps({"error": message}))
        sys.exit(2)


def build_parser() -> JsonArgumentParser:
    # `--session` is accepted before or after the subcommand.
    common = argparse.ArgumentParser(add_help=False)
    common.add_argument("--session", default=argparse.SUPPRESS, help="the session id")

    parser = JsonArgumentParser(description=__doc__.splitlines()[0], parents=[common])
    sub = parser.add_subparsers(dest="command", required=True)

    p_set = sub.add_parser("set", parents=[common], help="point this session at a front")
    p_set.add_argument("slug")
    p_set.add_argument("home", help="doc or file")
    p_set.add_argument("where", help="the doc URL or the front folder")

    sub.add_parser("get", parents=[common], help="print the pointer")
    sub.add_parser("clear", parents=[common], help="remove the pointer")

    p_outage = sub.add_parser("outage", parents=[common], help="mark a Docs outage")
    outage_sub = p_outage.add_subparsers(dest="outage_command", required=True)
    p_start = outage_sub.add_parser("start", parents=[common], help="the outage begins")
    p_start.add_argument("dir", help="the outage folder")
    p_start.add_argument("base_rev", help="the doc revision the outage started from")
    outage_sub.add_parser("end", parents=[common], help="the outage is merged back")
    return parser


def run(args: argparse.Namespace) -> dict:
    session_id = getattr(args, "session", None) or os.environ.get("CLAUDE_CODE_SESSION_ID")
    if not session_id:
        raise UsageError("no session id: pass --session or set CLAUDE_CODE_SESSION_ID")
    if not SESSION_RE.match(session_id):
        raise UsageError(f"bad session id {session_id!r}: expected [A-Za-z0-9._-]+")
    path = pointer_path(session_id)

    if args.command == "set":
        return cmd_set(path, session_id, args.slug, args.home, args.where)
    if args.command == "get":
        return {"pointer": read_pointer(session_id, path.parent.parent)}
    if args.command == "clear":
        existed = path.exists()
        if existed:
            path.unlink()
        return {"cleared": existed}
    if args.outage_command == "start":
        return cmd_outage_start(path, session_id, args.dir, args.base_rev)
    return cmd_outage_end(path, session_id)


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        out = run(args)
    except UsageError as exc:
        print(json.dumps({"error": str(exc)}))
        return 2
    except PointerError as exc:
        body: dict = {"error": str(exc)}
        if exc.pointer is not None:
            body["pointer"] = exc.pointer
        print(json.dumps(body))
        return 1
    except OSError as exc:
        print(json.dumps({"error": f"could not write the pointer: {exc}"}))
        return 1
    print(json.dumps(out))
    return 0


if __name__ == "__main__":
    sys.exit(main())
