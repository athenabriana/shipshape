#!/usr/bin/env python3
"""
Whether a PR may be put up for merge from Telegram, by Ship Shape's review gate.

Part of the companion plugin, Apache License, Version 2.0 (see LICENSE and NOTICE).

It checks, for one PR: open and not a draft; CI green on the head commit; the repository's
own rules not blocking it (GitHub's merge state); a `Review loop:` verdict line in the
description with verdict `clean` or `disputed` and no goal left open; and that the verdict
still covers the head, by Ship Shape's `patch_id.py --pr N` run in a local clone of the
repository, reading the same verdict line. It then prints the exact merge command when
every check passes, pinned to the head commit with `--match-head-commit`.

It decides nothing and merges nothing. The companion asks Athena only when `ok` is true,
and runs the printed command only after her word in the Telegram chat; that command then
waits for her tap on the permission button. It does not know whether the PR changes a user
interface: `design_line` says whether the description carries the design loop's line, and
the companion requires it on a UI PR.

The local clone is found among the live sessions' folders and under `~/Workspaces`, or
given with `--repo-dir`. `patch_id.py` comes from the newest installed ss plugin, or from
`COMPANION_SS_ROOT`.

Usage:
  python3 merge_gate.py OWNER/REPO NUMBER [--repo-dir PATH]

Prints JSON: {ok, pr, url, title, head, ci, merge_state, verdict, rounds, goals, unchanged,
design_line, reasons, merge_command}. When the PR cannot be read: {"error": "..."}, exit 1.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import github as GH  # noqa: E402
import sessions as S  # noqa: E402

REPO_RE = re.compile(r"^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$")
SHA_RE = re.compile(r"^[0-9a-f]{40}$")
DESIGN_LINE = re.compile(r"^Design: .+$", re.MULTILINE)

QUERY = """
query($owner: String!, $name: String!, $number: Int!) {
  repository(owner: $owner, name: $name) {
    squashMergeAllowed mergeCommitAllowed rebaseMergeAllowed
    pullRequest(number: $number) {
      number url title state isDraft headRefOid body mergeStateStatus
      commits(last: 1) { nodes { commit { oid statusCheckRollup { state } } } }
    }
  }
}
"""


def fail(message: str) -> None:
    print(json.dumps({"error": S.excerpt(message, 300)}))
    sys.exit(1)


def read_pr(repo: str, number: int) -> dict:
    owner, name = repo.split("/", 1)
    try:
        data = GH.graphql(QUERY, {"owner": owner, "name": name, "number": number})
    except GH.GitHubError as err:
        fail(f"could not read {repo}#{number} with gh: {err}")
    repo_data = data.get("repository") or {}
    if not isinstance(repo_data.get("pullRequest"), dict):
        fail(f"{repo}#{number} not found")
    return repo_data


def git(args: list[str], cwd: str, timeout: int = 10) -> str | None:
    try:
        out = subprocess.run(["git", "-C", cwd, *args], capture_output=True, text=True, timeout=timeout)
    except (OSError, subprocess.SubprocessError):
        return None
    return out.stdout.strip() if out.returncode == 0 else None


def origin_matches(folder: str, repo: str) -> bool:
    url = (git(["remote", "get-url", "origin"], folder) or "").lower()
    return bool(re.search(rf"github\.com[:/]{re.escape(repo.lower())}(\.git)?/?$", url))


def candidate_folders(extra: list[str]) -> list[str]:
    found = list(extra)
    seen = set(found)

    def add(folder: str) -> None:
        if folder not in seen:
            seen.add(folder)
            found.append(folder)

    for entry in S.live_sessions(S.claude_home()):
        if isinstance(entry.get("cwd"), str):
            add(entry["cwd"])
    root = Path.home() / "Workspaces"
    try:
        # Two levels down (Workspaces/<group>/<repo>), where checkouts usually live.
        for group in sorted(p for p in root.iterdir() if p.is_dir()):
            try:
                children = sorted(p for p in group.iterdir() if p.is_dir())
            except OSError:
                continue
            for folder in [group, *children]:
                if (folder / ".git").exists():
                    add(str(folder))
    except OSError:
        pass
    return found


def find_clone(repo: str, extra: list[str]) -> str | None:
    for folder in candidate_folders(extra):
        if Path(folder).is_dir() and origin_matches(folder, repo):
            return folder
    return None


def version_key(path: Path) -> tuple:
    return tuple(int(p) if p.isdigit() else 0 for p in path.parent.parent.name.split("."))


def find_patch_id() -> Path | None:
    root = os.environ.get("COMPANION_SS_ROOT")
    if root:
        path = Path(root) / "scripts" / "patch_id.py"
        return path if path.is_file() else None
    cache = S.claude_home() / "plugins" / "cache" / "shipshape" / "ss"
    found = sorted(cache.glob("*/scripts/patch_id.py"), key=version_key)
    return found[-1] if found else None


def measure(script: Path, clone: str, repo: str, number: int) -> tuple[dict | None, str | None]:
    """patch_id.py's JSON for the PR, or why it could not be had."""
    # GH_REPO pins gh to this repository: in a clone with an `upstream` remote, gh would
    # otherwise read that repository's PR of the same number.
    env = {**os.environ, "GH_REPO": repo}
    try:
        out = subprocess.run(
            [sys.executable, str(script), "--pr", str(number)],
            cwd=clone,
            env=env,
            capture_output=True,
            text=True,
            timeout=180,
        )
    except subprocess.TimeoutExpired:
        return None, "patch_id.py did not finish in time"
    except (OSError, subprocess.SubprocessError) as err:
        return None, f"patch_id.py could not run: {err.__class__.__name__}"
    try:
        patch = json.loads(out.stdout)
    except ValueError:
        return None, S.excerpt(out.stderr or "patch_id.py printed no JSON", 200)
    if not isinstance(patch, dict):
        return None, "patch_id.py printed something other than an object"
    if "error" in patch:
        return None, S.excerpt(str(patch["error"]), 200)
    return patch, None


def merge_method(repo_data: dict) -> str | None:
    if repo_data.get("squashMergeAllowed"):
        return "--squash"
    if repo_data.get("mergeCommitAllowed"):
        return "--merge"
    if repo_data.get("rebaseMergeAllowed"):
        return "--rebase"
    return None


MERGE_STATES = {
    "BLOCKED": "the repository's rules block the merge (required reviews or checks)",
    "DIRTY": "the PR has merge conflicts",
    "BEHIND": "the branch is behind its base and the repository requires it up to date",
    "UNKNOWN": "GitHub has not computed mergeability yet; check again in a moment",
}


def judge(repo: str, number: int, repo_data: dict, patch: dict | None, patch_error: str | None) -> dict:
    pr = repo_data["pullRequest"]
    head = pr.get("headRefOid") or ""
    ci = GH.ci_state(pr)
    verdict = GH.last_verdict(pr.get("body"))
    goals = verdict.group(4) if verdict else None
    reasons: list[str] = []

    if pr.get("state") != "OPEN":
        reasons.append(f"the PR is {str(pr.get('state')).lower()}")
    if pr.get("isDraft"):
        reasons.append("the PR is a draft")
    if ci != "SUCCESS":
        reasons.append(f"CI is not green on the head commit (state: {ci or 'none'})")
    state = pr.get("mergeStateStatus")
    if state in MERGE_STATES:
        reasons.append(MERGE_STATES[state])
    if verdict is None:
        reasons.append("no review verdict in the description: the PR goes back for a review round")
    else:
        if verdict.group(2) not in ("clean", "disputed"):
            reasons.append(f"the review verdict is {verdict.group(2)}: each open finding must be named in the ask")
        left = GH.goals_left(goals)
        if left:
            reasons.append(f"the review left goals undone ({S.excerpt(left, 80)}): each must be named in the ask")
    unchanged = None
    if patch_error:
        reasons.append(f"could not check that the verdict covers the head: {patch_error}")
    elif patch is not None and verdict is not None:
        unchanged = patch.get("unchanged")
        recorded = patch.get("recorded") or {}
        if patch.get("head") != head:
            reasons.append("the patch-id was measured on another commit than the PR head")
        elif recorded.get("patch_id") != verdict.group(3):
            reasons.append("the verdict line changed while the gate ran; run the gate again")
        elif unchanged is not True:
            reasons.append("the review verdict does not cover the current head: it needs a new review round")
    method = merge_method(repo_data)
    if method is None:
        reasons.append("the repository allows no merge method")
    command = None
    if not reasons and method and SHA_RE.match(head):
        command = f"gh pr merge {number} --repo {repo} {method} --match-head-commit {head}"
    return {
        "ok": not reasons,
        "pr": f"{repo}#{number}",
        "url": pr.get("url"),
        "title": S.excerpt(str(pr.get("title") or ""), 120),
        "head": head,
        "ci": ci,
        "merge_state": state,
        "verdict": verdict.group(2) if verdict else None,
        "rounds": int(verdict.group(1)) if verdict else None,
        "goals": goals,
        "unchanged": unchanged,
        "design_line": bool(DESIGN_LINE.search(pr.get("body") or "")),
        "reasons": reasons,
        "merge_command": command,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="The review gate for a merge from Telegram.")
    parser.add_argument("repo", help="OWNER/REPO")
    parser.add_argument("number", type=int)
    parser.add_argument("--repo-dir", action="append", default=[], help="a local clone to use")
    args = parser.parse_args()
    if not REPO_RE.match(args.repo) or args.number <= 0:
        fail("give the repository as OWNER/REPO and a positive PR number")

    repo_data = read_pr(args.repo, args.number)
    patch, patch_error = None, None
    script = find_patch_id()
    if script is None:
        patch_error = "Ship Shape's patch_id.py was not found (install ss or set COMPANION_SS_ROOT)"
    else:
        clone = find_clone(args.repo, args.repo_dir)
        if clone is None:
            patch_error = f"no local clone of {args.repo} found (pass --repo-dir)"
        else:
            patch, patch_error = measure(script, clone, args.repo, args.number)
    print(json.dumps(judge(args.repo, args.number, repo_data, patch, patch_error)))


if __name__ == "__main__":
    main()
