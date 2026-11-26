#!/usr/bin/env python3
"""
Unit tests for front_merge.py. `plan` is checked directly on three versions of a Now
tab, and `main` through a subprocess on files in a temp dir, so the JSON on stdout and
the exit code are what gets checked.

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

SCRIPT = Path(__file__).resolve().parent / "front_merge.py"
sys.path.insert(0, str(SCRIPT.parent))

from front_merge import plan  # noqa: E402

SESSIONS_HEADER = (
    "| name | session id | task | state | last report (one line) |\n"
    "| ---- | ---------- | ---- | ----- | ---------------------- |\n"
)
SESSIONS = {
    "auth": "| auth | s-1 | fix auth | running | started |",
    "docs": "| docs | s-2 | write docs | running | started |",
}


def now_tab(
    goal: str = "Fix the login.",
    sessions: dict[str, str] | None = None,
    auths: list[str] | None = None,
    nxt: str = "Wait for CI.",
) -> str:
    rows = SESSIONS if sessions is None else sessions
    auth_lines = "\n".join(auths or [])
    return (
        "# ss front · fix-login\n\n"
        "State: open · orchestrator s-0 · opened 2026-11-20\n\n"
        f"## Goal\n\n{goal}\n\n"
        "## Work sessions\n\n"
        + SESSIONS_HEADER
        + "".join(row + "\n" for row in rows.values())
        + f"\n## Merge authorizations\n\n{auth_lines}\n\n"
        f"## Next\n\n{nxt}\n"
    )


def item(items: list[dict], section: str, row: str | None = "-") -> dict:
    for it in items:
        if it["section"] == section and (row == "-" or it.get("row") == row):
            return it
    raise AssertionError(f"no item for {section} / {row}")


class SectionTest(unittest.TestCase):
    def test_ours_only_change(self) -> None:
        items = plan(now_tab(), now_tab(nxt="Merge PR 4."), now_tab())
        self.assertEqual(item(items, "Next")["take"], "ours")
        self.assertEqual(item(items, "Goal")["take"], "same")
        self.assertEqual(item(items, "(preamble)")["take"], "same")

    def test_theirs_only_change(self) -> None:
        items = plan(now_tab(), now_tab(), now_tab(goal="Fix login and logout."))
        it = item(items, "Goal")
        self.assertEqual(it["take"], "theirs")
        self.assertEqual(it["theirs"], "Fix login and logout.")

    def test_same_change_on_both(self) -> None:
        items = plan(now_tab(), now_tab(nxt="Ship."), now_tab(nxt="Ship.   \n\n"))
        self.assertEqual(item(items, "Next")["take"], "same")

    def test_conflict(self) -> None:
        items = plan(now_tab(), now_tab(nxt="Ship."), now_tab(nxt="Hold."))
        self.assertEqual(item(items, "Next")["take"], "conflict")

    def test_section_missing_on_one_side_is_empty(self) -> None:
        theirs = now_tab() + "\n## Waiting on Athena\n\nPick a name.\n"
        it = item(plan(now_tab(), now_tab(), theirs), "Waiting on Athena")
        self.assertEqual((it["take"], it["base"], it["ours"]), ("theirs", "", ""))

    def test_base_meta_line_stripped(self) -> None:
        base = "<!-- ss outage · base rev 3 · since 2026-11-26T10:00:00Z -->\n" + now_tab()
        items = plan(base, now_tab(), now_tab())
        self.assertEqual(item(items, "(preamble)")["take"], "same")
        self.assertNotIn("ss outage", item(items, "(preamble)")["base"])


class TableTest(unittest.TestCase):
    def test_rows_changed_on_different_sides(self) -> None:
        ours = {**SESSIONS, "auth": "| auth | s-1 | fix auth | done | PR 4 green |"}
        theirs = {**SESSIONS, "docs": "| docs | s-2 | write docs | blocked | needs input |"}
        items = plan(now_tab(), now_tab(sessions=ours), now_tab(sessions=theirs))
        self.assertEqual(item(items, "Work sessions", "auth")["take"], "ours")
        self.assertEqual(item(items, "Work sessions", "docs")["take"], "theirs")
        rows = [it for it in items if it["section"] == "Work sessions"]
        self.assertEqual([it["row"] for it in rows], ["auth", "docs"])
        self.assertFalse(any(it["take"] == "conflict" for it in items))

    def test_row_conflict(self) -> None:
        ours = {**SESSIONS, "auth": "| auth | s-1 | fix auth | done | ok |"}
        theirs = {**SESSIONS, "auth": "| auth | s-1 | fix auth | stopped | no |"}
        items = plan(now_tab(), now_tab(sessions=ours), now_tab(sessions=theirs))
        self.assertEqual(item(items, "Work sessions", "auth")["take"], "conflict")

    def test_row_removed_in_ours(self) -> None:
        ours = {"docs": SESSIONS["docs"]}
        items = plan(now_tab(), now_tab(sessions=ours), now_tab())
        it = item(items, "Work sessions", "auth")
        self.assertEqual(it["take"], "ours")
        self.assertIsNone(it["ours"])
        self.assertEqual(it["base"], SESSIONS["auth"])

    def test_row_added_in_theirs_keeps_order(self) -> None:
        theirs = {**SESSIONS, "tests": "| tests | s-3 | add tests | running | started |"}
        items = plan(now_tab(), now_tab(), now_tab(sessions=theirs))
        it = item(items, "Work sessions", "tests")
        self.assertEqual((it["take"], it["base"], it["ours"]), ("theirs", None, None))


class AuthorizationTest(unittest.TestCase):
    def test_doc_side_change_asks(self) -> None:
        base = now_tab(auths=["- PR 4 in repo a"])
        ours = now_tab(auths=["- PR 4 in repo a", "- PR 7 in repo b"])
        theirs = now_tab(auths=["- PR 4 in repo a", "- PR 9 in repo c"])
        items = plan(base, ours, theirs)
        it = item(items, "Merge authorizations")
        self.assertEqual(it["take"], "ask")
        self.assertEqual(it["ours_added"], ["- PR 7 in repo b"])
        self.assertEqual(it["theirs_added"], ["- PR 9 in repo c"])
        self.assertEqual(it["theirs_removed"], [])

    def test_doc_side_removal_asks(self) -> None:
        base = now_tab(auths=["- PR 4 in repo a"])
        it = item(plan(base, base, now_tab(auths=[])), "Merge authorizations")
        self.assertEqual(it["take"], "ask")
        self.assertEqual(it["theirs_removed"], ["- PR 4 in repo a"])

    def test_ours_only_authorization(self) -> None:
        base = now_tab(auths=[])
        ours = now_tab(auths=["- PR 7 in repo b"])
        it = item(plan(base, ours, base), "Merge authorizations")
        self.assertEqual(it["take"], "ours")
        self.assertEqual(it["ours_added"], ["- PR 7 in repo b"])
        self.assertEqual((it["theirs_added"], it["theirs_removed"]), ([], []))

    def test_no_change(self) -> None:
        base = now_tab(auths=["- PR 4 in repo a"])
        self.assertEqual(item(plan(base, base, base), "Merge authorizations")["take"], "same")


class MergeCliTest(unittest.TestCase):
    def setUp(self) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        self.dir = Path(self._tmp.name)
        for name, text in (("BASE.md", now_tab()), ("NOW.md", now_tab(nxt="Ship.")),
                           ("theirs.md", now_tab(nxt="Hold."))):
            (self.dir / name).write_text(text, encoding="utf-8")

    def tearDown(self) -> None:
        self._tmp.cleanup()

    def run_cli(self, *extra: str) -> tuple[int, dict]:
        proc = subprocess.run(
            [sys.executable, str(SCRIPT), str(self.dir / "BASE.md"), str(self.dir / "NOW.md"),
             str(self.dir / "theirs.md"), *extra],
            capture_output=True,
            text=True,
            encoding="utf-8",
        )
        return proc.returncode, json.loads(proc.stdout)

    def test_counts_conflicts(self) -> None:
        code, out = self.run_cli()
        self.assertEqual(code, 0)
        self.assertEqual(out["conflicts"], 1)
        self.assertIsNone(out["log_append"])
        self.assertEqual(out["notes"], [])

    def test_log_append(self) -> None:
        log = self.dir / "LOG.md"
        log.write_text("\n- 10:02 PR 4 went green\n- 10:30 merged PR 4\n\n", encoding="utf-8")
        _, out = self.run_cli("--log", str(log), "--start", "2026-11-26T10:00:00Z",
                              "--end", "2026-11-26T11:00:00Z")
        self.assertEqual(
            out["log_append"],
            "Written during the Docs outage, 2026-11-26T10:00:00Z to 2026-11-26T11:00:00Z\n"
            "- 10:02 PR 4 went green\n- 10:30 merged PR 4",
        )

    def test_empty_log_is_null(self) -> None:
        log = self.dir / "LOG.md"
        log.write_text("\n  \n", encoding="utf-8")
        _, out = self.run_cli("--log", str(log), "--start", "a", "--end", "b")
        self.assertIsNone(out["log_append"])

    def test_log_needs_start_and_end(self) -> None:
        log = self.dir / "LOG.md"
        log.write_text("x\n", encoding="utf-8")
        code, out = self.run_cli("--log", str(log))
        self.assertEqual(code, 2)
        self.assertIn("error", out)

    def test_notes_listing(self) -> None:
        notes = self.dir / "notes"
        (notes / "sub").mkdir(parents=True)
        (notes / "b-plan.md").write_text("b", encoding="utf-8")
        (notes / "a-ideas.md").write_text("a", encoding="utf-8")
        _, out = self.run_cli("--notes", str(notes))
        self.assertEqual(
            out["notes"],
            [{"title": "a-ideas", "path": str((notes / "a-ideas.md").resolve())},
             {"title": "b-plan", "path": str((notes / "b-plan.md").resolve())}],
        )

    def test_missing_file(self) -> None:
        proc = subprocess.run(
            [sys.executable, str(SCRIPT), str(self.dir / "BASE.md"), str(self.dir / "nope.md"),
             str(self.dir / "theirs.md")],
            capture_output=True,
            text=True,
            encoding="utf-8",
        )
        self.assertEqual(proc.returncode, 2)
        self.assertIn("error", json.loads(proc.stdout))


if __name__ == "__main__":
    unittest.main()
