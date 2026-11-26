#!/usr/bin/env python3
"""
Unit tests for check_project_facts.py. Each case builds a throwaway repo in a temp
directory and runs the script the way its callers do, through a subprocess, so the exit
code and the JSON on stdout are what gets checked.

Usage:
  python3 -m unittest discover -s plugins/ss/scripts -p 'test_*.py' -v
"""

from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parent / "check_project_facts.py"
GIT_IDENTITY = [
    "-c",
    "user.name=Test",
    "-c",
    "user.email=test@example.com",
    "-c",
    "commit.gpgsign=false",
]


def facts_body(count: int) -> str:
    lines = [f"- Fact number {i} holds for this repo." for i in range(count)]
    return "# Repo\n\n## Project facts\n\n" + "\n".join(lines) + "\n"


class CheckProjectFactsTest(unittest.TestCase):
    def setUp(self) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        self.repo = Path(self._tmp.name)

    def tearDown(self) -> None:
        self._tmp.cleanup()

    def run_check(self, *extra: str) -> dict:
        proc = subprocess.run(
            [sys.executable, str(SCRIPT), str(self.repo), *extra],
            capture_output=True,
            text=True,
            encoding="utf-8",
        )
        self.assertEqual(proc.returncode, 0, proc.stderr)
        return json.loads(proc.stdout)

    def git(self, *args: str) -> None:
        subprocess.run(
            ["git", *GIT_IDENTITY, "-C", str(self.repo), *args],
            check=True,
            capture_output=True,
        )

    def write(self, name: str, text: str) -> None:
        path = self.repo / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")

    def commit_then_add(self, line: str) -> dict:
        """Commits a facts file, appends one line, and checks the diff against that commit."""
        self.git("init", "-q")
        self.write("CLAUDE.md", facts_body(3))
        self.git("add", "CLAUDE.md")
        self.git("commit", "-q", "-m", "base")
        with (self.repo / "CLAUDE.md").open("a", encoding="utf-8") as handle:
            handle.write(line + "\n")
        return self.run_check("--diff-range", "HEAD")

    def kinds(self, result: dict) -> list[str]:
        return [flag["kind"] for flag in result["flags"]]

    def test_61_lines_flags_the_cap(self) -> None:
        self.write("CLAUDE.md", facts_body(61))
        result = self.run_check()
        self.assertEqual(result["line_count"], 61)
        self.assertIn("over_cap", self.kinds(result))

    def test_file_without_the_section_counts_zero(self) -> None:
        self.write("CLAUDE.md", "# Repo\n\n" + "\n".join(f"- Rule {i}." for i in range(80)) + "\n")
        result = self.run_check()
        self.assertEqual(result["line_count"], 0)
        self.assertEqual(result["flags"], [])

    def test_added_line_outside_the_section_is_not_flagged(self) -> None:
        self.git("init", "-q")
        self.write("CLAUDE.md", "# Repo\n\nIntro.\n\n" + facts_body(2).split("\n", 2)[2])
        self.git("add", "CLAUDE.md")
        self.git("commit", "-q", "-m", "base")
        text = (self.repo / "CLAUDE.md").read_text(encoding="utf-8")
        self.write("CLAUDE.md", text.replace("Intro.\n", "Intro.\nSee PR #42, done 2026-11-26.\n"))
        result = self.run_check("--diff-range", "HEAD")
        self.assertEqual(result["added_lines"], [])
        self.assertEqual(result["flags"], [])

    def test_60_lines_flags_nothing(self) -> None:
        self.write("CLAUDE.md", facts_body(60))
        result = self.run_check()
        self.assertEqual(result["line_count"], 60)
        self.assertEqual(result["flags"], [])

    def test_added_line_with_a_date_is_flagged(self) -> None:
        result = self.commit_then_add("- The cache moved to Redis on 2026-11-26.")
        self.assertEqual(result["added_lines"], ["- The cache moved to Redis on 2026-11-26."])
        self.assertIn("dated", self.kinds(result))

    def test_added_line_with_an_issue_number_is_flagged(self) -> None:
        result = self.commit_then_add("- Keep the retry loop, see #42.")
        self.assertIn("numbered", self.kinds(result))

    def test_added_line_with_a_status_word_is_flagged(self) -> None:
        result = self.commit_then_add("- The migration to the new queue is in progress.")
        self.assertIn("status", self.kinds(result))

    def test_added_line_over_160_characters_is_flagged(self) -> None:
        result = self.commit_then_add("- " + "a" * 170)
        self.assertIn("too_long", self.kinds(result))

    def test_clean_added_line_is_not_flagged(self) -> None:
        result = self.commit_then_add("- Billing amounts are integer cents, never floats.")
        self.assertEqual(result["flags"], [])

    def test_both_files_pick_claude_md(self) -> None:
        self.write("CLAUDE.md", facts_body(1))
        self.write("AGENTS.md", facts_body(1))
        result = self.run_check()
        self.assertEqual(result["facts_file"], "CLAUDE.md")
        self.assertTrue(result["both_claude_and_agents"])

    def test_dot_claude_comes_before_agents_md(self) -> None:
        self.write(".claude/CLAUDE.md", facts_body(1))
        self.write("AGENTS.md", facts_body(1))
        result = self.run_check()
        self.assertEqual(result["facts_file"], ".claude/CLAUDE.md")
        self.assertTrue(result["both_claude_and_agents"])

    def test_only_agents_md(self) -> None:
        self.write("AGENTS.md", facts_body(1))
        result = self.run_check()
        self.assertEqual(result["facts_file"], "AGENTS.md")
        self.assertFalse(result["both_claude_and_agents"])

    def test_no_facts_file(self) -> None:
        result = self.run_check()
        self.assertIsNone(result["facts_file"])
        self.assertEqual(result["line_count"], 0)
        self.assertEqual(result["flags"], [])

    def test_range_outside_a_git_repo_reports_an_error(self) -> None:
        self.write("CLAUDE.md", facts_body(1))
        result = self.run_check("--diff-range", "HEAD")
        self.assertTrue(result["errors"])
        self.assertEqual(result["added_lines"], [])

    def test_bad_range_reports_an_error(self) -> None:
        self.git("init", "-q")
        self.write("CLAUDE.md", facts_body(1))
        self.git("add", "CLAUDE.md")
        self.git("commit", "-q", "-m", "base")
        result = self.run_check("--diff-range", "no-such-ref...HEAD")
        self.assertTrue(result["errors"])

    def test_missing_repo_argument_still_exits_0_with_json(self) -> None:
        proc = subprocess.run(
            [sys.executable, str(SCRIPT)],
            capture_output=True,
            text=True,
            encoding="utf-8",
        )
        self.assertEqual(proc.returncode, 0, proc.stderr)
        self.assertTrue(json.loads(proc.stdout)["errors"])


if __name__ == "__main__":
    unittest.main()
