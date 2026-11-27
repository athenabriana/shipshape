#!/usr/bin/env python3
"""
Whether a PR may be put up for merge from Telegram, by Ship Shape's review gate.

Part of the companion plugin, Apache License, Version 2.0 (see LICENSE and NOTICE).

It checks, for one PR: open and not a draft; CI green on the head commit; the repository's
own rules not blocking it (GitHub's merge state); a `Review loop:` verdict line in the
description with verdict `clean` or `disputed`; and that the verdict still covers the head,
by Ship Shape's `patch_id.py --pr N` run in a local clone of the repository. It then prints
the exact merge command when every check passes, pinned to the head commit with `--match-head-commit`.

It decides nothing and merges nothing. The companion asks Athena only when `ok` is true,
and runs the printed command only after her word in the Telegram chat; that command then
waits for her tap on the permission button.

The local clone is found among the live sessions' folders and under `~/Workspaces`, or
given with `--repo-dir`. `patch_id.py` comes from the newest installed ss plugin, or from
`COMPANION_SS_ROOT`.

Usage:
  python3 merge_gate.py OWNER/REPO NUMBER [--repo-dir PATH]

Prints JSON: {ok, pr, url, title, head, ci, merge_state, verdict, rounds, unchanged,
design_line, reasons, merge_command}. On a failure to read the PR: {"error": "..."}, exit 1.
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
import sessions as S  # noqa: E402

REPO_RE = re.compile(r"^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$")
SHA_RE = re.compile(r"^[0-9a-f]{40}$")
VERDICT_LINE = re.compile(r"Review loop: (\d+) rounds?, verdict (\w+), patch-id ([0-9a-f]{40,64})")
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


def run(cmd: list[str], cwd: str | None = None, timeout: int = 120) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=timeout)


def fail(message: str) -> None:
    print(json.dumps({"error": message}))
    sys.exit(1)


def read_pr(repo: str, number: int) -> dict:
    owner, name = repo.split("/", 1)
    out = run(
        [
            "gh",
            "api",
            "graphql",
            "-f",
            f"query={QUERY}",
            "-f",
            f"owner={owner}",
            "-f",
            f"name={name}",
            "-F",
            f"number={number}",
        ]
    )
    if out.returncode != 0:
        fail(f"could not read {repo}#{number} with gh: {S.excerpt(out.stderr, 200)}")
    data = (json.loads(out.stdout).get("data") or {}).get("repository") or {}
    if not data.get("pullRequest"):
        fail(f"{repo}#{number} not found")
    return data


def origin_matches(folder: str, repo: str) -> bool:
    out = run(["git", "-C", folder, "remote", "get-url", "origin"], timeout=10)
    if out.returncode != 0:
        return False
    url = out.stdout.strip().lower()
    return bool(re.search(rf"github\.com[:/]{re.escape(repo.lower())}(\.git)?/?$", url))


def candidate_folders(extra: list[str]) -> list[str]:
    seen: list[str] = []
    for folder in extra:
        seen.append(folder)
    for entry in S.live_sessions(S.claude_home()):
        cwd = entry.get("cwd")
        if isinstance(cwd, str) and cwd not in seen:
            seen.append(cwd)
    root = Path.home() / "Workspaces"
    if root.is_dir():
        # Two levels down (Workspaces/<group>/<repo>), where checkouts usually live.
        for group in sorted(p for p in root.iterdir() if p.is_dir()):
            for repo in [group, *sorted(p for p in group.iterdir() if p.is_dir())]:
                if (repo / ".git").exists() and str(repo) not in seen:
                    seen.append(str(repo))
    return seen


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


def merge_method(repo_data: dict) -> str | None:
    if repo_data.get("squashMergeAllowed"):
        return "--squash"
    if repo_data.get("mergeCommitAllowed"):
        return "--merge"
    if repo_data.get("rebaseMergeAllowed"):
        return "--rebase"
    return None


def judge(repo: str, number: int, repo_data: dict, patch: dict | None, patch_error: str | None) -> dict:
    pr = repo_data["pullRequest"]
    head = pr.get("headRefOid") or ""
    nodes = (pr.get("commits") or {}).get("nodes") or []
    ci = (((nodes[-1] or {}).get("commit") or {}).get("statusCheckRollup") or {}).get("state") if nodes else None
    verdicts = list(VERDICT_LINE.finditer(pr.get("body") or ""))
    verdict = verdicts[-1] if verdicts else None
    reasons: list[str] = []

    if pr.get("state") != "OPEN":
        reasons.append(f"the PR is {str(pr.get('state')).lower()}")
    if pr.get("isDraft"):
        reasons.append("the PR is a draft")
    if ci != "SUCCESS":
        reasons.append(f"CI is not green on the head commit (state: {ci or 'none'})")
    state = pr.get("mergeStateStatus")
    if state in ("BLOCKED", "DIRTY", "BEHIND", "UNKNOWN"):
        reasons.append(
            {
                "BLOCKED": "the repository's rules block the merge (required reviews or checks)",
                "DIRTY": "the PR has merge conflicts",
                "BEHIND": "the branch is behind its base and the repository requires it up to date",
                "UNKNOWN": "GitHub has not computed mergeability yet; check again in a moment",
            }[state]
        )
    if verdict is None:
        reasons.append("no review verdict in the description: the PR goes back for a review round")
    elif verdict.group(2) not in ("clean", "disputed"):
        reasons.append(f"the review verdict is {verdict.group(2)}: each open finding must be named in the ask")
    unchanged = None
    if patch_error:
        reasons.append(f"could not check that the verdict covers the head: {patch_error}")
    elif patch is not None:
        unchanged = patch.get("unchanged")
        if patch.get("head") != head:
            reasons.append("the patch-id was measured on another commit than the PR head")
        elif verdict is not None and unchanged is not True:
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
        "title": pr.get("title"),
        "head": head,
        "ci": ci,
        "merge_state": state,
        "verdict": verdict.group(2) if verdict else None,
        "rounds": int(verdict.group(1)) if verdict else None,
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
    clone = find_clone(args.repo, args.repo_dir)
    if script is None:
        patch_error = "Ship Shape's patch_id.py was not found (install ss or set COMPANION_SS_ROOT)"
    elif clone is None:
        patch_error = f"no local clone of {args.repo} found (pass --repo-dir)"
    else:
        out = run([sys.executable, str(script), "--pr", str(args.number)], cwd=clone)
        try:
            patch = json.loads(out.stdout)
        except ValueError:
            patch_error = S.excerpt(out.stderr or "patch_id.py printed no JSON", 200)
        else:
            if "error" in patch:
                patch_error, patch = str(patch["error"]), None
    print(json.dumps(judge(args.repo, args.number, repo_data, patch, patch_error)))


if __name__ == "__main__":
    main()
