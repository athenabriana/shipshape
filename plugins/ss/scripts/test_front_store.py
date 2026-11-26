#!/usr/bin/env python3
"""
Unit tests for front_store.py. `render_now` is checked directly, and every subcommand
through a subprocess with `SS_HOME` pointed at a temp dir, so the JSON on stdout, the
exit code and the folders on disk are what gets checked.

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

SCRIPT = Path(__file__).resolve().parent / "front_store.py"
sys.path.insert(0, str(SCRIPT.parent))

from front_store import NOW_TEMPLATE, render_now  # noqa: E402

DATE_RE = r"\d{4}-\d{2}-\d{2}"


class RenderNowTest(unittest.TestCase):
    def test_fills_the_template(self) -> None:
        text = render_now("fix-login", "sess-1", "2026-11-26")
        self.assertTrue(text.startswith("# ss front · fix-login\n\n"))
        self.assertIn("State: open · orchestrator sess-1 · opened 2026-11-26\n", text)
        self.assertIn("<one paragraph, Athena's words>\n", text)
        self.assertIn("- WHEN <...> THEN <...>\n", text)
        for heading in ("Goal", "Acceptance criteria", "Repos", "Work sessions",
                        "Waiting on Athena", "Merge authorizations", "Next"):
            self.assertIn(f"\n## {heading}\n", text)
        self.assertNotIn("{", text)
        self.assertIn("{slug}", NOW_TEMPLATE)


class FrontStoreCliTest(unittest.TestCase):
    def setUp(self) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        self.home = Path(self._tmp.name) / "ss"

    def tearDown(self) -> None:
        self._tmp.cleanup()

    def run_cli(self, *args: str) -> tuple[int, dict]:
        env = {**os.environ, "SS_HOME": str(self.home)}
        proc = subprocess.run(
            [sys.executable, str(SCRIPT), *args],
            capture_output=True,
            text=True,
            encoding="utf-8",
            env=env,
        )
        return proc.returncode, json.loads(proc.stdout)

    def base_file(self, text: str = "# ss front · fix-login\n\nState: open\n\n## Goal\n\nX\n") -> Path:
        path = Path(self._tmp.name) / "base.md"
        path.write_text(text, encoding="utf-8")
        return path

    # create

    def test_create(self) -> None:
        code, out = self.run_cli("create", "fix-login", "--orchestrator", "sess-1")
        self.assertEqual(code, 0)
        front = self.home / "fronts" / "fix-login"
        self.assertEqual(out["path"], str(front.resolve()))
        now = Path(out["now"]).read_text(encoding="utf-8")
        self.assertRegex(now, rf"State: open · orchestrator sess-1 · opened {DATE_RE}\n")
        self.assertEqual(Path(out["log"]).read_text(encoding="utf-8"), "# ss front · fix-login · log\n")
        self.assertTrue(Path(out["notes"]).is_dir())
        self.assertEqual(list(Path(out["notes"]).iterdir()), [])

    def test_create_default_orchestrator(self) -> None:
        _, out = self.run_cli("create", "fix-login")
        self.assertIn("orchestrator unknown", Path(out["now"]).read_text(encoding="utf-8"))

    def test_create_refused_when_front_exists(self) -> None:
        self.run_cli("create", "fix-login")
        code, out = self.run_cli("create", "fix-login")
        self.assertEqual(code, 1)
        self.assertIn("error", out)

    def test_create_refused_when_outage_exists(self) -> None:
        (self.home / "outage" / "fix-login").mkdir(parents=True)
        self.assertEqual(self.run_cli("create", "fix-login")[0], 1)

    def test_bad_slug(self) -> None:
        code, out = self.run_cli("create", "Fix_Login")
        self.assertEqual(code, 2)
        self.assertIn("error", out)

    # exists

    def test_exists(self) -> None:
        self.assertEqual(
            self.run_cli("exists", "fix-login"),
            (0, {"slug": "fix-login", "file_front": False, "outage": False, "exists": False}),
        )
        self.run_cli("create", "fix-login")
        _, out = self.run_cli("exists", "fix-login")
        self.assertEqual((out["file_front"], out["outage"], out["exists"]), (True, False, True))
        (self.home / "outage" / "doc-front").mkdir(parents=True)
        _, out = self.run_cli("exists", "doc-front")
        self.assertEqual((out["file_front"], out["outage"], out["exists"]), (False, True, True))

    # list

    def test_list_missing_home(self) -> None:
        self.assertEqual(self.run_cli("list"), (0, {"fronts": []}))

    def test_list_skips_landed_and_merged(self) -> None:
        self.run_cli("create", "b-open", "--orchestrator", "s1")
        self.run_cli("create", "a-landed")
        self.run_cli("land", "a-landed")
        self.run_cli("outage-init", "c-doc", str(self.base_file()), "4", "--since", "2026-11-26T10:00:00Z")
        (self.home / "outage" / "d-old.merged-2026-11-01").mkdir(parents=True)

        code, out = self.run_cli("list")
        self.assertEqual(code, 0)
        fronts = out["fronts"]
        self.assertEqual([(f["slug"], f["kind"]) for f in fronts], [("b-open", "file"), ("c-doc", "outage")])
        self.assertRegex(fronts[0]["state"], rf"^open · orchestrator s1 · opened {DATE_RE}$")
        self.assertEqual(
            fronts[1],
            {"slug": "c-doc", "kind": "outage", "state": "outage", "since": "2026-11-26T10:00:00Z",
             "base_rev": 4, "path": str((self.home / "outage" / "c-doc").resolve())},
        )

    def test_list_all_includes_landed(self) -> None:
        self.run_cli("create", "a-landed")
        self.run_cli("land", "a-landed")
        _, out = self.run_cli("list", "--all")
        self.assertEqual(len(out["fronts"]), 1)
        self.assertTrue(out["fronts"][0]["state"].startswith("landed"))

    # land

    def test_land(self) -> None:
        self.run_cli("create", "fix-login", "--orchestrator", "s1")
        code, out = self.run_cli("land", "fix-login")
        self.assertEqual(code, 0)
        self.assertTrue(out["changed"])
        self.assertRegex(out["state"], rf"^landed · orchestrator s1 · opened {DATE_RE} · landed {DATE_RE}$")
        now = (self.home / "fronts" / "fix-login" / "NOW.md").read_text(encoding="utf-8")
        self.assertIn("State: " + out["state"] + "\n", now)
        self.assertTrue((self.home / "fronts" / "fix-login").is_dir())

    def test_land_is_idempotent(self) -> None:
        self.run_cli("create", "fix-login")
        _, first = self.run_cli("land", "fix-login")
        code, second = self.run_cli("land", "fix-login")
        self.assertEqual(code, 0)
        self.assertFalse(second["changed"])
        self.assertEqual(second["state"], first["state"])

    def test_land_missing_front(self) -> None:
        self.assertEqual(self.run_cli("land", "nope")[0], 1)

    # outage-init

    def test_outage_init(self) -> None:
        base = "# ss front · doc-front\n\nState: open\n\n## Goal\n\nX\n"
        code, out = self.run_cli("outage-init", "doc-front", str(self.base_file(base)), "9",
                                 "--since", "2026-11-26T10:00:00Z")
        self.assertEqual(code, 0)
        folder = self.home / "outage" / "doc-front"
        self.assertEqual(out, {"slug": "doc-front", "path": str(folder.resolve()), "base_rev": 9,
                               "since": "2026-11-26T10:00:00Z"})
        self.assertEqual(
            (folder / "BASE.md").read_text(encoding="utf-8"),
            "<!-- ss outage · base rev 9 · since 2026-11-26T10:00:00Z -->\n" + base,
        )
        self.assertEqual((folder / "NOW.md").read_text(encoding="utf-8"), base)
        self.assertEqual((folder / "LOG.md").read_text(encoding="utf-8"), "")
        self.assertTrue((folder / "notes").is_dir())

    def test_outage_init_default_since(self) -> None:
        _, out = self.run_cli("outage-init", "doc-front", str(self.base_file()), "1")
        self.assertRegex(out["since"], rf"^{DATE_RE}T\d{{2}}:\d{{2}}:\d{{2}}Z$")

    def test_outage_init_refused_on_file_front(self) -> None:
        self.run_cli("create", "fix-login")
        self.assertEqual(self.run_cli("outage-init", "fix-login", str(self.base_file()), "1")[0], 1)

    def test_outage_init_refused_when_outage_exists(self) -> None:
        self.run_cli("outage-init", "doc-front", str(self.base_file()), "1")
        self.assertEqual(self.run_cli("outage-init", "doc-front", str(self.base_file()), "2")[0], 1)

    def test_outage_init_missing_base_file(self) -> None:
        code, out = self.run_cli("outage-init", "doc-front", str(Path(self._tmp.name) / "nope.md"), "1")
        self.assertEqual(code, 2)
        self.assertIn("error", out)

    # outage-close

    def test_outage_close_adds_a_counter(self) -> None:
        self.run_cli("outage-init", "doc-front", str(self.base_file()), "1")
        code, first = self.run_cli("outage-close", "doc-front")
        self.assertEqual(code, 0)
        self.assertRegex(Path(first["to"]).name, rf"^doc-front\.merged-{DATE_RE}$")
        self.assertTrue(Path(first["to"]).is_dir())
        self.assertFalse((self.home / "outage" / "doc-front").exists())

        self.run_cli("outage-init", "doc-front", str(self.base_file()), "2")
        _, second = self.run_cli("outage-close", "doc-front")
        self.assertEqual(Path(second["to"]).name, Path(first["to"]).name + "-2")
        self.assertTrue(Path(first["to"]).is_dir())

    def test_outage_close_missing(self) -> None:
        self.assertEqual(self.run_cli("outage-close", "doc-front")[0], 1)


if __name__ == "__main__":
    unittest.main()
