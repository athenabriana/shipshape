#!/usr/bin/env python3
"""SessionStart hook: re-establish the operating frame at session start and after a
context compaction, exactly when the model has lost the thread. Emits
operating-context.md, the line that resolves `<plugin-root>`, and, when this session
orchestrates a front, the line that sends it back to that front, as
`additionalContext`.

The front line comes from the session's pointer, `SS_HOME/front-of/<session id>`,
read through `scripts/front_pointer.py`. The session id is the `session_id` of the
hook's stdin JSON, else `CLAUDE_CODE_SESSION_ID`. Any failure there drops the front
line and nothing else: the hook never raises and always exits 0.

Deliberately light and principle-level: it loads on every session in every repo
where the plugin is enabled, so it nudges the way of working, it does not force a
mode. Edit operating-context.md to change the frame.
"""

from __future__ import annotations

import json
import os
import pathlib
import sys
from collections.abc import Mapping


def read_frame(here: pathlib.Path) -> str:
    try:
        return (here / "operating-context.md").read_text(encoding="utf-8").strip()
    except OSError:
        return ""  # missing file -> stay silent, never block the session


def root_line(root: pathlib.Path) -> str:
    # Forward slashes so the path works as-is in Bash, Read and Workflow script paths.
    return (
        f"- **The ss plugin lives at `{root.as_posix()}` on this machine.** Where an ss "
        "document writes `<plugin-root>`, that directory is what it names: put it in and "
        "use the path as it stands, in a `Bash` call, a `Read`, or a `Workflow` script "
        "path. It is resolved once per session, here, so nothing downstream searches "
        "for it."
    )


def front_line(pointer: dict | None) -> str:
    """The bullet that sends an orchestrator back to its front, or "" without one."""
    if not pointer:
        return ""
    try:
        slug, home, where = pointer["slug"], pointer["home"], pointer["where"]
        if not slug or not where:
            return ""
        if pointer.get("state") == "outage" and pointer.get("outage"):
            return (
                f"- **You are the orchestrator of front `{slug}`, and front `{slug}` is in a "
                f"Docs outage;** read `NOW.md` in `{pointer['outage']}`, and at the start of "
                "each turn check whether the Docs tools are back (a `ToolSearch` for the Docs "
                f"`read` tool). The doc at `{where}` is stale until the merge."
            )
        if home == "doc":
            how = "(a Docs `read` of the Now tab)"
        elif home == "file":
            how = "(a `Read` of `NOW.md`)"
        else:
            return ""
        return (
            f"- **You are the orchestrator of front `{slug}`;** before anything else read its "
            f"Now tab at `{where}` {how}. The pointer holds a location, never the front's state."
        )
    except (KeyError, TypeError):
        return ""


def session_id_of(stdin_text: str, env: Mapping[str, str]) -> str | None:
    try:
        data = json.loads(stdin_text) if stdin_text and stdin_text.strip() else None
    except ValueError:
        data = None
    if isinstance(data, dict) and isinstance(data.get("session_id"), str) and data["session_id"]:
        return data["session_id"]
    return env.get("CLAUDE_CODE_SESSION_ID") or None


def load_pointer(root: pathlib.Path, stdin_text: str, env: Mapping[str, str]) -> dict | None:
    try:
        session_id = session_id_of(stdin_text, env)
        if not session_id:
            return None
        scripts = str(root / "scripts")
        if scripts not in sys.path:
            sys.path.insert(0, scripts)
        from front_pointer import read_pointer

        return read_pointer(session_id, env.get("SS_HOME") or None)
    except Exception:  # noqa: BLE001  a broken pointer must never block the session
        return None


def build_context(
    here: pathlib.Path, root: pathlib.Path, stdin_text: str, env: Mapping[str, str]
) -> str:
    root_part = root_line(root)
    front = front_line(load_pointer(root, stdin_text, env))
    if front:
        root_part = f"{root_part}\n{front}"
    return "\n\n".join(p for p in (read_frame(here), root_part) if p)


def read_stdin() -> str:
    try:
        if sys.stdin is None or sys.stdin.isatty():
            return ""
        return sys.stdin.read()
    except (OSError, ValueError):
        return ""


def main() -> int:
    here = pathlib.Path(__file__).resolve().parent
    root = pathlib.Path(os.environ.get("CLAUDE_PLUGIN_ROOT") or here.parent)
    ctx = build_context(here, root, read_stdin(), os.environ)
    print(
        json.dumps(
            {
                "hookSpecificOutput": {
                    "hookEventName": "SessionStart",
                    "additionalContext": ctx,
                }
            }
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
