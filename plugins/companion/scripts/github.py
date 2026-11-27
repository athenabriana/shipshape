"""
What watch.py and merge_gate.py share about GitHub: the GraphQL call, a PR's CI state, and
Ship Shape's review verdict line.

Part of the companion plugin, Apache License, Version 2.0 (see LICENSE and NOTICE).
"""

from __future__ import annotations

import json
import re
import subprocess

# The verdict line `/ss:review`'s loop writes in a PR description. Its source of truth is
# Ship Shape's `scripts/patch_id.py` (VERDICT_LINE there): the goal status after the
# patch-id came in ss 5.13.0, and a line from before it has none.
VERDICT_LINE = re.compile(
    r"Review loop: (\d+) rounds?, verdict (\w+), patch-id ([0-9a-f]{40,64})"
    r"(?:, goals ([^\r\n]*?)\.?(?=\r?\n|$))?"
)


class GitHubError(RuntimeError):
    pass


def graphql(query: str, variables: dict[str, str | int] | None = None, timeout: int = 60) -> dict:
    """The `data` of one `gh api graphql` call.

    `gh` exits non-zero when the answer carries any `errors`, even next to complete data (a
    search hit in an organization the token may not read). Data that came back is used;
    only a call with no data at all raises.
    """
    cmd = ["gh", "api", "graphql", "-f", f"query={query}"]
    for key, value in (variables or {}).items():
        # -F types an int as a GraphQL Int; -f keeps a string a string, digits and all.
        cmd += ["-F" if isinstance(value, int) else "-f", f"{key}={value}"]
    try:
        out = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    except (OSError, subprocess.SubprocessError) as err:
        raise GitHubError(f"gh could not run: {err.__class__.__name__}") from err
    try:
        data = json.loads(out.stdout).get("data")
    except (ValueError, AttributeError):
        data = None
    if not isinstance(data, dict):
        first = (out.stderr or "gh returned no data").strip().splitlines()
        raise GitHubError(first[0][:200] if first else "gh returned no data")
    return data


def ci_state(pr: dict) -> str | None:
    """The status rollup of the PR's head commit: SUCCESS, FAILURE, PENDING, ERROR or None."""
    nodes = ((pr.get("commits") or {}).get("nodes")) or []
    last = nodes[-1] if nodes and isinstance(nodes[-1], dict) else {}
    rollup = (last.get("commit") or {}).get("statusCheckRollup") or {}
    return rollup.get("state")


def last_verdict(body: str | None) -> re.Match | None:
    found = list(VERDICT_LINE.finditer(body or ""))
    return found[-1] if found else None


def goals_left(goals: str | None) -> str | None:
    """What the goal status leaves undone, or None when nothing is.

    `goals 4 of 4 achieved`, `goals none` and no status at all (a line from before 5.13.0)
    leave nothing. `goals 3 of 4 achieved, G4 deferred` leaves nothing either: a deferred
    goal stands with its ground. Anything `open`, or fewer achieved than counted with no
    deferral to account for them, is left.
    """
    if not goals or goals.strip() == "none":
        return None
    if re.search(r"\bopen\b", goals):
        return goals
    m = re.search(r"(\d+) of (\d+) achieved", goals)
    if m and int(m.group(1)) < int(m.group(2)) and "deferred" not in goals:
        return goals
    return None
