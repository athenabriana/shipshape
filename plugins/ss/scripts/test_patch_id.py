#!/usr/bin/env python3
"""
Unit tests for patch_id.py's verdict line reader. The review loop writes the line with
the goal status after the patch-id, and a line from the lightweight route or an older loop
carries none; both read the same verdict and patch-id.

Usage:
  python3 -m unittest discover -s plugins/ss/scripts -p 'test_*.py' -v
"""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from patch_id import recorded_verdict  # noqa: E402

PID = "a" * 40


class RecordedVerdictTest(unittest.TestCase):
    def test_line_with_goal_status(self) -> None:
        body = f"Context.\n\nReview loop: 3 rounds, verdict clean, patch-id {PID}, goals 4 of 4 achieved.\n"
        got = recorded_verdict(body)
        self.assertEqual(got["verdict"], "clean")
        self.assertEqual(got["rounds"], 3)
        self.assertEqual(got["patch_id"], PID)
        self.assertEqual(got["goals"], "4 of 4 achieved")

    def test_open_goal_named(self) -> None:
        body = f"Review loop: 2 rounds, verdict open, patch-id {PID}, goals 3 of 4 achieved, G2 open."
        self.assertEqual(recorded_verdict(body)["goals"], "3 of 4 achieved, G2 open")

    def test_line_without_goal_status(self) -> None:
        got = recorded_verdict(f"Review loop: 1 round, verdict clean, patch-id {PID}.")
        self.assertEqual(got["verdict"], "clean")
        self.assertIsNone(got["goals"])

    def test_last_line_wins(self) -> None:
        other = "b" * 40
        body = (
            f"Review loop: 1 round, verdict open, patch-id {PID}, goals 1 of 2 achieved, G2 open.\n"
            f"Review loop: 2 rounds, verdict clean, patch-id {other}, goals 2 of 2 achieved.\n"
        )
        got = recorded_verdict(body)
        self.assertEqual(got["patch_id"], other)
        self.assertEqual(got["goals"], "2 of 2 achieved")

    def test_period_inside_goal_status(self) -> None:
        body = f"Review loop: 2 rounds, verdict open, patch-id {PID}, goals 1 of 2 achieved, G2 open (no test in loop.md yet).\nNext line."
        self.assertEqual(recorded_verdict(body)["goals"], "1 of 2 achieved, G2 open (no test in loop.md yet)")

    def test_crlf_body(self) -> None:
        body = f"Context.\r\nReview loop: 3 rounds, verdict clean, patch-id {PID}, goals 4 of 4 achieved.\r\nMore.\r\n"
        self.assertEqual(recorded_verdict(body)["goals"], "4 of 4 achieved")

    def test_goals_none(self) -> None:
        got = recorded_verdict(f"Review loop: 1 round, verdict clean, patch-id {PID}, goals none.")
        self.assertEqual(got["goals"], "none")

    def test_no_line(self) -> None:
        self.assertIsNone(recorded_verdict("No verdict here."))


if __name__ == "__main__":
    unittest.main()
