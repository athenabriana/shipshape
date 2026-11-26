#!/usr/bin/env python3
"""
Unit tests for route.py. `pick` is checked branch by branch, and `main` through a
subprocess, the way /ss:go calls it, so the printed line and the exit code are what gets
checked.

Usage:
  python3 -m unittest discover -s plugins/ss/scripts -p 'test_*.py' -v
"""

from __future__ import annotations

import subprocess
import sys
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parent / "route.py"
sys.path.insert(0, str(SCRIPT.parent))

from route import pick  # noqa: E402

# The calmest facts: every test changes only what it is about.
CALM = {
    "blast_radius": "low",
    "reversible": "yes",
    "data_or_auth": "no",
    "coverage": "good",
    "files": 1,
}


def route_of(**facts: object) -> tuple[str, str]:
    return pick(**{**CALM, **facts})


class HardFactsTest(unittest.TestCase):
    """Any one hard fact alone makes the route intensive."""

    def test_high_blast_radius(self) -> None:
        self.assertEqual(route_of(blast_radius="high"), ("intensive", "high blast radius"))

    def test_not_reversible(self) -> None:
        self.assertEqual(route_of(reversible="no"), ("intensive", "not reversible"))

    def test_data_or_auth(self) -> None:
        self.assertEqual(route_of(data_or_auth="yes"), ("intensive", "touches data or auth"))

    def test_hard_facts_listed_together(self) -> None:
        route, reason = route_of(blast_radius="high", reversible="no", data_or_auth="yes")
        self.assertEqual(route, "intensive")
        self.assertEqual(reason, "high blast radius, not reversible, touches data or auth")

    def test_hard_fact_wins_over_soft_facts(self) -> None:
        route, reason = route_of(reversible="no", blast_radius="medium", coverage="none", files=9)
        self.assertEqual((route, reason), ("intensive", "not reversible"))


class SoftFactsTest(unittest.TestCase):
    """One or two soft facts make it standard, three or more intensive."""

    def test_calm_change_is_lightweight(self) -> None:
        self.assertEqual(route_of(), ("lightweight", "small, reversible, covered change"))

    def test_zero_files_is_lightweight(self) -> None:
        self.assertEqual(route_of(files=0)[0], "lightweight")

    def test_two_files_stay_lightweight(self) -> None:
        self.assertEqual(route_of(files=2)[0], "lightweight")

    def test_some_coverage_on_few_files_stays_lightweight(self) -> None:
        self.assertEqual(route_of(coverage="some", files=2)[0], "lightweight")

    def test_medium_blast_radius(self) -> None:
        self.assertEqual(route_of(blast_radius="medium"), ("standard", "medium blast radius"))

    def test_no_coverage(self) -> None:
        self.assertEqual(route_of(coverage="none"), ("standard", "no tests nearby"))

    def test_many_files(self) -> None:
        self.assertEqual(route_of(files=3), ("standard", "3 files"))

    def test_some_coverage_counts_past_two_files(self) -> None:
        self.assertEqual(
            route_of(coverage="some", files=3), ("standard", "partial coverage, 3 files")
        )

    def test_three_soft_facts_are_intensive(self) -> None:
        route, reason = route_of(blast_radius="medium", coverage="none", files=5)
        self.assertEqual(route, "intensive")
        self.assertEqual(reason, "medium blast radius, no tests nearby, 5 files")

    def test_partial_coverage_makes_the_third(self) -> None:
        route, reason = route_of(blast_radius="medium", coverage="some", files=4)
        self.assertEqual(route, "intensive")
        self.assertEqual(reason, "medium blast radius, partial coverage, 4 files")


class CommandLineTest(unittest.TestCase):
    def run_script(self, *args: str) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [sys.executable, str(SCRIPT), *args], capture_output=True, text=True, check=False
        )

    def test_prints_route_and_reason(self) -> None:
        result = self.run_script(
            "--blast-radius", "low", "--reversible", "yes", "--data-or-auth", "no",
            "--coverage", "good", "--files", "1",
        )
        self.assertEqual(result.returncode, 0)
        self.assertEqual(result.stdout.strip(), "lightweight: small, reversible, covered change")

    def test_intensive_on_the_command_line(self) -> None:
        result = self.run_script(
            "--blast-radius", "high", "--reversible", "yes", "--data-or-auth", "no",
            "--coverage", "good", "--files", "1",
        )
        self.assertEqual(result.stdout.strip(), "intensive: high blast radius")

    def test_negative_files_is_an_error(self) -> None:
        result = self.run_script(
            "--blast-radius", "low", "--reversible", "yes", "--data-or-auth", "no",
            "--coverage", "good", "--files", "-1",
        )
        self.assertEqual(result.returncode, 2)
        self.assertIn("--files must be 0 or more", result.stderr)

    def test_unknown_value_is_an_error(self) -> None:
        result = self.run_script(
            "--blast-radius", "huge", "--reversible", "yes", "--data-or-auth", "no",
            "--coverage", "good", "--files", "1",
        )
        self.assertEqual(result.returncode, 2)

    def test_missing_fact_is_an_error(self) -> None:
        result = self.run_script("--blast-radius", "low")
        self.assertEqual(result.returncode, 2)


if __name__ == "__main__":
    unittest.main()
