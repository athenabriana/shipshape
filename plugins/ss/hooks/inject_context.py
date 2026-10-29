#!/usr/bin/env python3
"""SessionStart hook: re-establish the operating frame at session start and after a
context compaction, exactly when the model has lost the thread. Emits
operating-context.md plus the line that resolves `<plugin-root>` as
`additionalContext`.

Deliberately light and principle-level: it loads on every session in every repo
where the plugin is enabled, so it nudges the way of working, it does not force a
mode. Edit operating-context.md to change the frame.
"""

from __future__ import annotations

import json
import os
import pathlib


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


def main() -> int:
    here = pathlib.Path(__file__).resolve().parent
    root = pathlib.Path(os.environ.get("CLAUDE_PLUGIN_ROOT") or here.parent)
    ctx = "\n\n".join(p for p in (read_frame(here), root_line(root)) if p)
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
