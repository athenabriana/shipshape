#!/usr/bin/env python3
"""
The growth check for a repo's project facts (`references/project-facts.md` is the
contract). It finds the facts file, counts its lines, reads the lines a diff adds to it,
and flags what the contract keeps out.

The facts file is the first of `CLAUDE.md`, `.claude/CLAUDE.md` and `AGENTS.md` that
exists at the repo root, or null when none does. `both_claude_and_agents` is true when the
repo has `AGENTS.md` beside either `CLAUDE.md`: Claude Code then leaves `AGENTS.md` unread,
so the facts belong in `CLAUDE.md`.

`line_count` counts the non-empty lines inside the `## Project facts` section, the heading
itself left out. The section runs to the next `#` or `##` heading. A file without that
heading holds no facts yet and counts 0, so the rest of a long `CLAUDE.md` never trips the
cap. More than 60 raises `over_cap`.

`added_lines` are the lines `git diff RANGE -- FACTS_FILE` adds inside that section (each
`+` line, `+++` left out, blank lines skipped), placed by the hunk's line numbers against
the section as the file stands on disk, so run it on a checkout of the range's head.
Without `--diff-range` there are none. Each added line is
flagged when it holds a date (`dated`), a PR or issue number (`numbered`), a status word
(`status`), or runs over 160 characters (`too_long`).

The script always exits 0 and prints JSON. A problem it meets, like a directory that is
not a git repo or a range git cannot resolve, goes in `errors`.

Consumed by /ss:learn's fact layer (to find the file and its count) and by /ss:review's rules
front (on a diff that touches `AGENTS.md` or `CLAUDE.md`).

Usage:
  python3 check_project_facts.py /path/to/repo
  python3 check_project_facts.py /path/to/repo --diff-range origin/main...HEAD
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
from pathlib import Path

CANDIDATES = ("CLAUDE.md", ".claude/CLAUDE.md", "AGENTS.md")
SECTION_HEADING = re.compile(r"^##\s+Project facts\s*$", re.IGNORECASE)
SECTION_END = re.compile(r"^#{1,2}\s")
CAP = 60
MAX_LINE = 160

MONTHS = (
    r"(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?"
    r"|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)"
)
DATE_PATTERNS = (
    re.compile(r"\b\d{4}-\d{1,2}-\d{1,2}\b"),
    re.compile(r"\b\d{1,2}/\d{1,2}/\d{2,4}\b"),
    re.compile(rf"\b{MONTHS}\.?\s+(?:\d{{1,2}}(?:st|nd|rd|th)?,?\s+)?\d{{4}}\b", re.IGNORECASE),
    re.compile(rf"\b\d{{1,2}}(?:st|nd|rd|th)?\s+(?:of\s+)?{MONTHS}\.?,?\s+\d{{4}}\b", re.IGNORECASE),
)
NUMBER_PATTERNS = (
    re.compile(r"(?<![\w&#])#\d+\b"),
    re.compile(r"\b(?:PR|MR|issue)\s*#?\d+\b", re.IGNORECASE),
    re.compile(r"\b(?:pull|pulls|issues|merge_requests)/\d+\b"),
)
STATUS_PATTERN = re.compile(
    r"\b(?:done|wip|in progress|in-progress|merged|pending|todo|to-do|shipped|blocked)\b",
    re.IGNORECASE,
)


def find_facts_file(repo: Path) -> tuple[str | None, bool]:
    """The facts file's path relative to the repo, and whether CLAUDE.md and AGENTS.md coexist."""
    present = [name for name in CANDIDATES if (repo / name).is_file()]
    has_claude = any(name != "AGENTS.md" for name in present)
    both = has_claude and "AGENTS.md" in present
    return (present[0] if present else None), both


def section_span(text: str) -> tuple[int, int] | None:
    """The 1-based first and last line numbers of the section's body, or None without one."""
    lines = text.splitlines()
    start = next((i for i, line in enumerate(lines) if SECTION_HEADING.match(line)), None)
    if start is None:
        return None
    end = len(lines)
    for i in range(start + 1, len(lines)):
        if SECTION_END.match(lines[i]):
            end = i
            break
    return start + 2, end


def count_lines(text: str) -> int:
    """Non-empty lines of the `## Project facts` section; 0 without one."""
    span = section_span(text)
    if span is None:
        return 0
    lines = text.splitlines()
    return sum(1 for line in lines[span[0] - 1 : span[1]] if line.strip())


HUNK = re.compile(r"^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@")


def added_lines(
    repo: Path, diff_range: str, facts_file: str, span: tuple[int, int], errors: list[str]
) -> list[str]:
    """The non-blank lines the diff adds inside the section; a git failure lands in `errors`."""
    if diff_range.startswith("-"):
        errors.append(f"diff range {diff_range!r} reads as an option, not a range")
        return []
    inside = subprocess.run(
        ["git", "-C", str(repo), "rev-parse", "--is-inside-work-tree"],
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    if inside.returncode != 0:
        errors.append(f"{repo} is not a git repository")
        return []
    diff = subprocess.run(
        [
            "git",
            "-C",
            str(repo),
            "diff",
            "--no-color",
            "--no-ext-diff",
            "--unified=0",
            diff_range,
            "--",
            facts_file,
        ],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    if diff.returncode != 0:
        errors.append(f"git diff {diff_range} failed: {diff.stderr.strip()}")
        return []
    added: list[str] = []
    new_line = 0
    for line in diff.stdout.splitlines():
        hunk = HUNK.match(line)
        if hunk:
            new_line = int(hunk.group(1))
            continue
        if line.startswith("+") and not line.startswith("+++"):
            if span[0] <= new_line <= span[1] and line[1:].strip():
                added.append(line[1:])
            new_line += 1
    return added


def line_flags(line: str) -> list[dict]:
    """One flag per kind the line breaks, each with the text that tripped it."""
    flags = []
    for kind, patterns in (("dated", DATE_PATTERNS), ("numbered", NUMBER_PATTERNS)):
        for pattern in patterns:
            hit = pattern.search(line)
            if hit:
                flags.append({"kind": kind, "line": line, "detail": f"holds {hit.group(0)!r}"})
                break
    status = STATUS_PATTERN.search(line)
    if status:
        flags.append(
            {"kind": "status", "line": line, "detail": f"holds the status word {status.group(0)!r}"}
        )
    if len(line) > MAX_LINE:
        flags.append(
            {"kind": "too_long", "line": line, "detail": f"{len(line)} characters, over {MAX_LINE}"}
        )
    return flags


def check(repo: Path, diff_range: str | None) -> dict:
    result = empty_result()
    errors: list[str] = result["errors"]
    if not repo.is_dir():
        errors.append(f"{repo} is not a directory")
        return result

    facts_file, both = find_facts_file(repo)
    result["facts_file"] = facts_file
    result["both_claude_and_agents"] = both
    if facts_file is None:
        return result

    try:
        text = (repo / facts_file).read_text(encoding="utf-8", errors="replace")
    except OSError as exc:
        errors.append(f"cannot read {facts_file}: {exc}")
        return result

    span = section_span(text)
    count = count_lines(text)
    result["line_count"] = count
    if count > CAP:
        result["flags"].append(
            {
                "kind": "over_cap",
                "line": None,
                "detail": f"{count} lines, over the cap of {CAP}: consolidate before adding",
            }
        )

    if diff_range and span is not None:
        added = added_lines(repo, diff_range, facts_file, span, errors)
        result["added_lines"] = added
        for line in added:
            result["flags"].extend(line_flags(line))

    return result


class _Parser(argparse.ArgumentParser):
    """Raises on a bad command line instead of exiting 2, so the error still reaches the JSON."""

    def error(self, message: str):  # type: ignore[override]
        raise ValueError(message)


def empty_result(*errors: str) -> dict:
    """The payload with nothing found yet, carrying any errors already met."""
    return {
        "facts_file": None,
        "both_claude_and_agents": False,
        "line_count": 0,
        "added_lines": [],
        "flags": [],
        "errors": list(errors),
    }


def main() -> None:
    parser = _Parser(description="Check a repo's project facts file.")
    parser.add_argument("repo", help="the repo root")
    parser.add_argument("--diff-range", help="a git diff range, like origin/main...HEAD")
    try:
        args, unknown = parser.parse_known_args()
    except ValueError as exc:
        print(json.dumps(empty_result(f"bad arguments: {exc}"), indent=2))
        return
    try:
        result = check(Path(args.repo).resolve(), args.diff_range)
    except Exception as exc:  # The contract is exit 0 with JSON, whatever goes wrong.
        result = empty_result(f"unexpected error: {exc}")
    if unknown:
        result["errors"].append(f"unknown arguments ignored: {' '.join(unknown)}")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
