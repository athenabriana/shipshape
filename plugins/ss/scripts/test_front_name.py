#!/usr/bin/env python3
"""
Unit tests for front_name.py. `kebab` and `cut` are checked directly, and `main`
through a subprocess with `SS_HOME` pointed at a temp dir, so the JSON on stdout and
the exit code are what gets checked.

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

SCRIPT = Path(__file__).resolve().parent / "front_name.py"
sys.path.insert(0, str(SCRIPT.parent))

from front_name import cut, kebab  # noqa: E402


class KebabTest(unittest.TestCase):
    def test_accents_fold_to_ascii(self) -> None:
        self.assertEqual(kebab("Fix sessão naming"), "fix-sessao-naming")

    def test_letters_without_a_base_fold(self) -> None:
        self.assertEqual(kebab("Straße Ørsted"), "strasse-orsted")

    def test_punctuation_collapses_to_one_hyphen(self) -> None:
        self.assertEqual(kebab("  Add: edge cases!! "), "add-edge-cases")


class CutTest(unittest.TestCase):
    def test_short_slug_stays(self) -> None:
        self.assertEqual(cut("add-edge-cases"), "add-edge-cases")

    def test_cut_at_last_hyphen(self) -> None:
        self.assertEqual(cut("orchestrate-session-naming"), "orchestrate-session")

    def test_one_long_word_is_cut(self) -> None:
        self.assertEqual(cut("a" * 30), "a" * 24)


class FrontNameCliTest(unittest.TestCase):
    def setUp(self) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        self.home = Path(self._tmp.name)

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

    def test_plain_slug(self) -> None:
        code, out = self.run_cli("Fix sessão naming")
        self.assertEqual(code, 0)
        self.assertEqual(out["slug"], "fix-sessao-naming")
        self.assertEqual(out["base"], "fix-sessao-naming")
        self.assertFalse(out["suffixed"])
        self.assertFalse(out["cut"])
        self.assertFalse(out["collision"])

    def test_cut_name(self) -> None:
        _, out = self.run_cli("orchestrate-session-naming")
        self.assertEqual(out["name"], "orchestrate-session")
        self.assertTrue(out["cut"])

    def test_collision_with_live(self) -> None:
        _, out = self.run_cli("fix-login", "--live", "other,fix-login")
        self.assertTrue(out["collision"])
        self.assertFalse(out["suffixed"])
        _, out = self.run_cli("fix-login", "--live", "other", "fix-login")
        self.assertTrue(out["collision"])

    def test_suffix_from_taken(self) -> None:
        _, out = self.run_cli("fix-login", "--taken", "fix-login")
        self.assertEqual(out["slug"], "fix-login-2")
        self.assertEqual(out["name"], "fix-login-2")
        self.assertEqual(out["base"], "fix-login")
        self.assertTrue(out["suffixed"])

    def test_suffix_from_fronts_folder(self) -> None:
        (self.home / "fronts" / "fix-login").mkdir(parents=True)
        _, out = self.run_cli("fix-login")
        self.assertEqual(out["slug"], "fix-login-2")

    def test_suffix_from_outage_folder(self) -> None:
        (self.home / "outage" / "fix-login").mkdir(parents=True)
        _, out = self.run_cli("fix-login")
        self.assertEqual(out["slug"], "fix-login-2")

    def test_suffix_from_merged_outage_folder(self) -> None:
        (self.home / "outage" / "fix-login.merged-2026-11-01").mkdir(parents=True)
        _, out = self.run_cli("fix-login")
        self.assertEqual(out["slug"], "fix-login-2")

    def test_third_when_second_taken(self) -> None:
        (self.home / "fronts" / "fix-login-2").mkdir(parents=True)
        _, out = self.run_cli("fix-login", "--taken", "fix-login")
        self.assertEqual(out["slug"], "fix-login-3")
        self.assertEqual(out["name"], "fix-login-3")

    def test_suffix_survives_cut(self) -> None:
        base = "orchestrate-session-namingx"  # 27 chars
        _, out = self.run_cli(base, "--taken", base)
        self.assertEqual(out["slug"], base + "-2")
        self.assertEqual(out["name"], "orchestrate-session-2")
        self.assertLessEqual(len(out["name"]), 24)
        self.assertTrue(out["cut"])

    def test_suffix_survives_cut_of_one_long_word(self) -> None:
        base = "a" * 30
        _, out = self.run_cli(base, "--taken", base)
        self.assertEqual(out["name"], "a" * 22 + "-2")

    def test_empty_input_is_an_error(self) -> None:
        code, out = self.run_cli("!!! ???")
        self.assertEqual(code, 1)
        self.assertIn("error", out)


if __name__ == "__main__":
    unittest.main()
