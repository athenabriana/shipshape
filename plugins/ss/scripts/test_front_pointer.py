#!/usr/bin/env python3
"""
Unit tests for front_pointer.py. `parse_pointer` and `read_pointer` are checked
directly, and the subcommands through a subprocess with `SS_HOME` pointed at a temp
dir, so the JSON on stdout, the exit code and the pointer file are what gets checked.

Usage:
  python3 -m unittest discover -s plugins/ss/scripts -p 'test_*.py' -v
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parent / "front_pointer.py"
sys.path.insert(0, str(SCRIPT.parent))

from front_pointer import parse_pointer, read_pointer  # noqa: E402

SESSION = "sess-123"
DOC = "https://claude.ai/artifact/abc"


class FrontPointerCliTest(unittest.TestCase):
    def setUp(self) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        self.home = Path(self._tmp.name)
        self.path = self.home / "front-of" / SESSION

    def tearDown(self) -> None:
        self._tmp.cleanup()

    def run_cli(self, *args: str, session: str | None = SESSION, env_session: str | None = None) -> tuple[int, dict]:
        env = {k: v for k, v in os.environ.items() if k != "CLAUDE_CODE_SESSION_ID"}
        env["SS_HOME"] = str(self.home)
        if env_session is not None:
            env["CLAUDE_CODE_SESSION_ID"] = env_session
        argv = [sys.executable, str(SCRIPT)]
        if session is not None:
            argv += ["--session", session]
        proc = subprocess.run(
            argv + list(args), capture_output=True, text=True, encoding="utf-8", env=env
        )
        return proc.returncode, json.loads(proc.stdout)

    def test_set_get_clear_round_trip(self) -> None:
        code, out = self.run_cli("set", "fix-login", "doc", DOC)
        self.assertEqual(code, 0)
        self.assertEqual(
            self.path.read_text(encoding="utf-8"),
            f"slug=fix-login\nhome=doc\nwhere={DOC}\n",
        )
        code, out = self.run_cli("get")
        self.assertEqual(code, 0)
        self.assertEqual(
            out["pointer"],
            {"slug": "fix-login", "home": "doc", "where": DOC, "state": None,
             "outage": None, "since": None, "base_rev": None},
        )
        self.assertEqual(self.run_cli("clear"), (0, {"cleared": True}))
        self.assertEqual(self.run_cli("get"), (0, {"pointer": None}))
        self.assertEqual(self.run_cli("clear"), (0, {"cleared": False}))

    def test_set_is_idempotent(self) -> None:
        self.run_cli("set", "fix-login", "file", "/a")
        code, out = self.run_cli("set", "fix-login", "file", "/b")
        self.assertEqual(code, 0)
        self.assertEqual(out["pointer"]["where"], "/b")
        self.assertEqual(self.path.read_text(encoding="utf-8"), "slug=fix-login\nhome=file\nwhere=/b\n")

    def test_set_with_other_slug_refused(self) -> None:
        self.run_cli("set", "fix-login", "doc", DOC)
        code, out = self.run_cli("set", "other", "doc", DOC)
        self.assertEqual(code, 1)
        self.assertIn("error", out)
        self.assertEqual(out["pointer"]["slug"], "fix-login")

    def test_set_with_other_home_refused(self) -> None:
        self.run_cli("set", "fix-login", "doc", DOC)
        code, out = self.run_cli("set", "fix-login", "file", "/a")
        self.assertEqual(code, 1)
        self.assertEqual(out["pointer"]["home"], "doc")

    def test_set_bad_slug_or_home(self) -> None:
        self.assertEqual(self.run_cli("set", "Bad_Slug", "doc", DOC)[0], 2)
        self.assertEqual(self.run_cli("set", "fix-login", "wiki", DOC)[0], 2)

    def test_outage_start_and_end(self) -> None:
        self.run_cli("set", "fix-login", "doc", DOC)
        code, out = self.run_cli("outage", "start", "/tmp/ss/outage/fix-login", "7")
        self.assertEqual(code, 0)
        pointer = out["pointer"]
        self.assertEqual(pointer["state"], "outage")
        self.assertEqual(pointer["outage"], "/tmp/ss/outage/fix-login")
        self.assertEqual(pointer["base_rev"], 7)
        self.assertRegex(pointer["since"], r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$")
        lines = self.path.read_text(encoding="utf-8").splitlines()
        self.assertEqual(lines[:4], ["slug=fix-login", "home=doc", f"where={DOC}", "state=outage"])
        self.assertRegex(lines[4], r"^outage=/tmp/ss/outage/fix-login   # since \S+, base rev 7$")

        self.assertEqual(self.run_cli("outage", "start", "/x", "8")[0], 1)

        code, out = self.run_cli("outage", "end")
        self.assertEqual(code, 0)
        self.assertIsNone(out["pointer"]["state"])
        self.assertEqual(self.path.read_text(encoding="utf-8"), f"slug=fix-login\nhome=doc\nwhere={DOC}\n")
        self.assertEqual(self.run_cli("outage", "end")[0], 1)

    def test_set_during_outage_keeps_outage(self) -> None:
        self.run_cli("set", "fix-login", "doc", DOC)
        self.run_cli("outage", "start", "/o", "3")
        _, out = self.run_cli("set", "fix-login", "doc", DOC + "2")
        self.assertEqual(out["pointer"]["state"], "outage")
        self.assertEqual(out["pointer"]["where"], DOC + "2")

    def test_outage_refused_on_file_home(self) -> None:
        self.run_cli("set", "fix-login", "file", "/a")
        code, out = self.run_cli("outage", "start", "/o", "3")
        self.assertEqual(code, 1)
        self.assertIn("error", out)

    def test_outage_refused_without_pointer(self) -> None:
        self.assertEqual(self.run_cli("outage", "start", "/o", "3")[0], 1)

    def test_session_from_env(self) -> None:
        code, _ = self.run_cli("set", "fix-login", "doc", DOC, session=None, env_session=SESSION)
        self.assertEqual(code, 0)
        self.assertTrue(self.path.exists())

    def test_session_after_subcommand(self) -> None:
        code, out = self.run_cli("get", "--session", SESSION, session=None)
        self.assertEqual((code, out), (0, {"pointer": None}))

    def test_missing_session_id(self) -> None:
        code, out = self.run_cli("get", session=None)
        self.assertEqual(code, 2)
        self.assertIn("error", out)

    def test_bad_session_id(self) -> None:
        code, out = self.run_cli("get", session="../etc")
        self.assertEqual(code, 2)
        self.assertIn("error", out)


class ParsePointerTest(unittest.TestCase):
    def test_hand_written_pointer_with_odd_spacing(self) -> None:
        text = (
            "\n"
            "  slug = fix-login  \n"
            "a line with no equals sign\n"
            "home=doc\n"
            "\n"
            "where =  https://claude.ai/artifact/abc?x=1\n"
            "state= outage\n"
            "outage = /home/me/.ss/outage/fix-login #   since 2026-11-26T10:00:00Z ,  base rev 12  \n"
        )
        self.assertEqual(
            parse_pointer(text),
            {
                "slug": "fix-login",
                "home": "doc",
                "where": "https://claude.ai/artifact/abc?x=1",
                "state": "outage",
                "outage": "/home/me/.ss/outage/fix-login",
                "since": "2026-11-26T10:00:00Z",
                "base_rev": 12,
            },
        )

    def test_read_pointer_bad_id_is_none(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            self.assertIsNone(read_pointer("../x", tmp))
            self.assertIsNone(read_pointer("", tmp))
            self.assertIsNone(read_pointer("nobody", tmp))


if __name__ == "__main__":
    unittest.main()
