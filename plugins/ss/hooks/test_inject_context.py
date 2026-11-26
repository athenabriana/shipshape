#!/usr/bin/env python3
"""
Unit tests for inject_context.py. `front_line` and `build_context` are checked
directly, and `main` through a subprocess with `SS_HOME` pointed at a temp dir, so the
JSON on stdout and the exit code are what gets checked.

Usage:
  python3 -m unittest discover -s plugins/ss/hooks -p 'test_*.py' -v
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parent / "inject_context.py"
HERE = SCRIPT.parent
ROOT = HERE.parent
sys.path.insert(0, str(HERE))

from inject_context import build_context, front_line  # noqa: E402

SESSION = "sess-123"
DOC = "https://claude.ai/artifact/abc"


def pointer(**fields: object) -> dict:
    base = {"slug": "fix-login", "home": "doc", "where": DOC, "state": None,
            "outage": None, "since": None, "base_rev": None}
    return {**base, **fields}


class FrontLineTest(unittest.TestCase):
    def test_no_pointer(self) -> None:
        self.assertEqual(front_line(None), "")

    def test_doc_pointer(self) -> None:
        self.assertEqual(
            front_line(pointer()),
            "- **You are the orchestrator of front `fix-login`;** before anything else read "
            f"its Now tab at `{DOC}` (a Docs `read` of the Now tab). The pointer holds a "
            "location, never the front's state.",
        )

    def test_file_pointer(self) -> None:
        line = front_line(pointer(home="file", where="/home/me/.ss/fronts/fix-login"))
        self.assertIn("read its Now tab at `/home/me/.ss/fronts/fix-login` (a `Read` of `NOW.md`).", line)
        self.assertTrue(line.endswith("The pointer holds a location, never the front's state."))

    def test_outage_pointer(self) -> None:
        line = front_line(pointer(state="outage", outage="/home/me/.ss/outage/fix-login",
                                  since="2026-11-26T10:00:00Z", base_rev=3))
        self.assertEqual(
            line,
            "- **You are the orchestrator of front `fix-login`, and front `fix-login` is in a "
            "Docs outage;** read `NOW.md` in `/home/me/.ss/outage/fix-login`, and at the start "
            "of each turn check whether the Docs tools are back (a `ToolSearch` for the Docs "
            f"`read` tool). The doc at `{DOC}` is stale until the merge.",
        )

    def test_malformed_pointer(self) -> None:
        self.assertEqual(front_line({"slug": "x"}), "")


class BuildContextTest(unittest.TestCase):
    def setUp(self) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        self.home = Path(self._tmp.name)
        self.env = {"SS_HOME": str(self.home)}

    def tearDown(self) -> None:
        self._tmp.cleanup()

    def write_pointer(self, text: str, session: str = SESSION) -> None:
        folder = self.home / "front-of"
        folder.mkdir(parents=True, exist_ok=True)
        (folder / session).write_text(text, encoding="utf-8")

    def stdin(self, session: str = SESSION) -> str:
        return json.dumps({"session_id": session, "hook_event_name": "SessionStart"})

    def test_no_pointer_no_line(self) -> None:
        ctx = build_context(HERE, ROOT, self.stdin(), self.env)
        self.assertNotIn("orchestrator of front", ctx)
        self.assertIn("The ss plugin lives at", ctx)

    def test_doc_pointer_line_follows_root_line(self) -> None:
        self.write_pointer(f"slug=fix-login\nhome=doc\nwhere={DOC}\n")
        ctx = build_context(HERE, ROOT, self.stdin(), self.env)
        self.assertIn("for it.\n- **You are the orchestrator of front `fix-login`;**", ctx)
        self.assertIn("(a Docs `read` of the Now tab)", ctx)

    def test_file_pointer(self) -> None:
        self.write_pointer("slug=fix-login\nhome=file\nwhere=/f/fix-login\n")
        ctx = build_context(HERE, ROOT, self.stdin(), self.env)
        self.assertIn("(a `Read` of `NOW.md`)", ctx)

    def test_outage_pointer(self) -> None:
        self.write_pointer(
            f"slug=fix-login\nhome=doc\nwhere={DOC}\nstate=outage\n"
            "outage=/o/fix-login   # since 2026-11-26T10:00:00Z, base rev 3\n"
        )
        ctx = build_context(HERE, ROOT, self.stdin(), self.env)
        self.assertIn("is in a Docs outage;** read `NOW.md` in `/o/fix-login`", ctx)

    def test_invalid_stdin_falls_back_to_env(self) -> None:
        self.write_pointer(f"slug=fix-login\nhome=doc\nwhere={DOC}\n")
        env = {**self.env, "CLAUDE_CODE_SESSION_ID": SESSION}
        self.assertIn("orchestrator of front", build_context(HERE, ROOT, "{not json", env))
        self.assertIn("orchestrator of front", build_context(HERE, ROOT, "", env))

    def test_bad_session_id_no_line(self) -> None:
        self.write_pointer(f"slug=fix-login\nhome=doc\nwhere={DOC}\n")
        ctx = build_context(HERE, ROOT, self.stdin("../front-of/" + SESSION), self.env)
        self.assertNotIn("orchestrator of front", ctx)

    def test_root_without_scripts_keeps_root_line(self) -> None:
        self.write_pointer(f"slug=fix-login\nhome=doc\nwhere={DOC}\n")
        ctx = build_context(HERE, self.home / "no-plugin", self.stdin(), self.env)
        self.assertIn("The ss plugin lives at", ctx)


class MainTest(unittest.TestCase):
    def run_hook(self, stdin: str, home: Path) -> tuple[int, dict]:
        env = {k: v for k, v in os.environ.items() if k != "CLAUDE_CODE_SESSION_ID"}
        env.update(SS_HOME=str(home), CLAUDE_PLUGIN_ROOT=str(ROOT))
        proc = subprocess.run(
            [sys.executable, str(SCRIPT)], input=stdin, capture_output=True, text=True,
            encoding="utf-8", env=env,
        )
        return proc.returncode, json.loads(proc.stdout)

    def test_no_pointer_valid_json(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            code, out = self.run_hook(json.dumps({"session_id": SESSION}), Path(tmp))
        self.assertEqual(code, 0)
        hook = out["hookSpecificOutput"]
        self.assertEqual(hook["hookEventName"], "SessionStart")
        self.assertNotIn("orchestrator of front", hook["additionalContext"])

    def test_pointer_through_main(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp) / "front-of"
            folder.mkdir()
            (folder / SESSION).write_text(f"slug=fix-login\nhome=doc\nwhere={DOC}\n", encoding="utf-8")
            code, out = self.run_hook(json.dumps({"session_id": SESSION}), Path(tmp))
        self.assertEqual(code, 0)
        self.assertIn("orchestrator of front `fix-login`", out["hookSpecificOutput"]["additionalContext"])

    def test_garbage_stdin_still_exits_zero(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            code, out = self.run_hook("\x00 not json", Path(tmp))
        self.assertEqual(code, 0)
        self.assertIn("additionalContext", out["hookSpecificOutput"])


if __name__ == "__main__":
    unittest.main()
