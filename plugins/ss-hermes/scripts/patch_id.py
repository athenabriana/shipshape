#!/usr/bin/env python3
"""
The patch-id of a branch's own change: `git patch-id` over the diff from the merge-base
with its base to the head. A review verdict records it, and ss:ship compares it with the
branch's current one. Equal means the review
read this same change, even after the base was merged in. It also finds, by patch-id, a
`Repro-test-commit` whose sha a history rewrite left off the branch.

The merge-base is taken against the freshly fetched `origin/<base>`: once the base is
merged into the branch, the merge-base moves up to the merged commit, so the diff holds
only the branch's own change. A stale `origin/<base>` would put the base's changes in the
diff and change the patch-id on every merge of the base. Line numbers do not count, but
the three lines of context do: a base change right next to a branch hunk changes the id,
and the verdict then asks for a review of the delta. `.ss/` is left out of the diff, as
review leaves it out: bookkeeping an earlier ss version keeps there does not move the
verdict.

Every diff here is produced with its options pinned (`DIFF_FLAGS`): the verdict's
patch-id is computed in one session and compared in another, often on another checkout,
and a user's `diff.algorithm`, `diff.noprefix` or rename setting must not move it.

The recorded verdict is the last `Review loop: ...` line of the PR description carrying a
patch-id (`skills/review/references/loop.md` writes it), or the one `--expect` passes
when no PR holds it yet.

Usage:
  python3 patch_id.py
  python3 patch_id.py --pr 42
  python3 patch_id.py --expect 3f1c... --base develop
  python3 patch_id.py --resolve 9ab2... --resolve 77de...

Prints JSON:
  {head, base_branch, base_ref, merge_base, patch_id, pr, recorded, unchanged[, resolved]}
`patch_id` is null when the diff is empty; `unchanged` is null when no verdict is
recorded. Each `resolved` entry is {sha, on_branch, available, patch_id, match}.
On failure: {"error": "..."} and exit 1.
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from shutil import which

# Pinned so the same change gives the same patch-id under any user's git config.
DIFF_FLAGS = [
    "--no-color",
    "--no-ext-diff",
    "--no-textconv",
    "--no-renames",
    "--no-relative",
    "--full-index",
    "--binary",
    "--diff-algorithm=myers",
    "--indent-heuristic",
    "--inter-hunk-context=0",
    "-U3",
    "--src-prefix=a/",
    "--dst-prefix=b/",
]

# `--verbatim` (which implies `--stable`) keeps whitespace in the id: an indentation
# change is a code change in Python or YAML, and plain `--stable` strips whitespace, so
# such a change would keep an old verdict.
PATCH_ID_FLAGS = ["--verbatim"]

# `.ss/` holds bookkeeping an earlier ss version left in the repo; review reads the code,
# so commits there must not move the id.
CODE_PATHSPEC = [":(top)", ":(top,exclude).ss"]

# A commit trailer is data: only a hex sha long enough to be unambiguous is looked up.
SHA = re.compile(r"^[0-9a-fA-F]{7,64}$")

VERDICT_LINE = re.compile(
    r"Review loop: (\d+) rounds?, verdict (\w+), patch-id ([0-9a-f]{40,64})"
)


def run(cmd: list[str], cwd: str, stdin: bytes | None = None) -> tuple[int, bytes, str]:
    p = subprocess.run(cmd, cwd=cwd, input=stdin, capture_output=True)
    return p.returncode, p.stdout, p.stderr.decode("utf-8", errors="replace").strip()


def run_ok(cmd: list[str], cwd: str) -> str | None:
    code, out, _ = run(cmd, cwd)
    return out.decode("utf-8", errors="replace").strip() if code == 0 else None


def fail(message: str) -> None:
    print(json.dumps({"error": message}))
    sys.exit(1)


def patch_ids(stream: bytes, cwd: str) -> list[tuple[str, str]]:
    """(patch_id, commit) pairs `git patch-id` prints for a diff or a `log -p` stream."""
    code, out, err = run(["git", "patch-id", *PATCH_ID_FLAGS], cwd, stdin=stream)
    if code != 0:
        fail(f"git patch-id failed: {err}")
    pairs = []
    for line in out.decode("ascii", errors="replace").splitlines():
        parts = line.split()
        if len(parts) == 2:
            pairs.append((parts[0], parts[1]))
    return pairs


def range_patch_id(base: str, head: str, cwd: str) -> str | None:
    code, diff, err = run(["git", "diff", *DIFF_FLAGS, base, head, "--", *CODE_PATHSPEC], cwd)
    if code != 0:
        fail(f"git diff {base} {head} failed: {err}")
    pairs = patch_ids(diff, cwd)
    return pairs[0][0] if pairs else None


def commit_patch_ids(rev_args: list[str], cwd: str) -> list[tuple[str, str]]:
    """Per-commit patch-ids, one `git log -p` stream for every commit the args select."""
    code, stream, err = run(
        [
            "git",
            "log",
            "-p",
            "--no-merges",
            "--no-show-signature",
            "--format=commit %H",
            *DIFF_FLAGS,
            *rev_args,
        ],
        cwd,
    )
    if code != 0:
        fail(f"git log -p {' '.join(rev_args)} failed: {err}")
    return patch_ids(stream, cwd)


def open_pr(cwd: str, number: int | None) -> dict | None:
    if which("gh") is None:
        return None
    cmd = ["gh", "pr", "view"]
    if number is not None:
        cmd.append(str(number))
    cmd += ["--json", "number,url,state,baseRefName,headRefOid,body"]
    raw = run_ok(cmd, cwd)
    try:
        pr = json.loads(raw) if raw else None
    except ValueError:
        return None
    # A branch's merged or closed PR is not the one this run ships or lands.
    if not pr or (number is None and (pr.get("state") or "").upper() != "OPEN"):
        return None
    return pr


def recorded_verdict(body: str) -> dict | None:
    matches = list(VERDICT_LINE.finditer(body or ""))
    if not matches:
        return None
    last = matches[-1]
    return {
        "patch_id": last.group(3),
        "verdict": last.group(2),
        "rounds": int(last.group(1)),
        "source": "description",
        "line": last.group(0),
    }


def resolve_commit(
    sha: str, commits: list[str], branch: list[tuple[str, str]], cwd: str
) -> dict:
    """Place a commit on the branch: by its sha, or by its patch-id once the sha is gone."""
    entry = {"sha": sha, "on_branch": False, "available": False, "patch_id": None, "match": None}
    if not sha or not SHA.match(sha):
        return entry
    on_branch = [commit for commit in commits if commit.startswith(sha.lower())]
    if on_branch:
        entry.update(on_branch=True, available=True, match=on_branch[0])
        entry["patch_id"] = next((pid for pid, c in branch if c == on_branch[0]), None)
        return entry

    full = run_ok(["git", "rev-parse", "--verify", "--quiet", f"{sha}^{{commit}}"], cwd)
    if not full:
        # A rewritten branch's old commits often stay fetchable by sha from the remote.
        run(["git", "fetch", "--quiet", "origin", sha], cwd)
        full = run_ok(["git", "rev-parse", "--verify", "--quiet", f"{sha}^{{commit}}"], cwd)
    if not full:
        return entry

    entry["available"] = True
    own = commit_patch_ids(["-1", full], cwd)
    if not own:
        return entry
    entry["patch_id"] = own[0][0]
    # Oldest first: a patch applied twice on the branch keeps the commit it first landed as.
    same = [commit for pid, commit in reversed(branch) if pid == entry["patch_id"]]
    entry["match"] = same[0] if same else None
    return entry


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Print the patch-id of the branch's own change and compare it with the review verdict's."
    )
    parser.add_argument("--repo", default=".", help="Path inside the target git repository.")
    parser.add_argument("--base", default=None, help="Base branch, overriding the PR's own and the repo default.")
    parser.add_argument("--pr", type=int, default=None, help="Measure this PR's head instead of HEAD.")
    parser.add_argument("--expect", default=None, help="The verdict's patch-id, when no PR description holds it yet.")
    parser.add_argument(
        "--resolve", action="append", default=[], metavar="SHA",
        help="A commit to find on the branch, by sha or by patch-id. Repeatable.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    cwd = run_ok(["git", "rev-parse", "--show-toplevel"], args.repo)
    if not cwd:
        fail("Not inside a git repository")

    pr = open_pr(cwd, args.pr)
    if args.pr is not None and not pr:
        fail(f"Could not read PR #{args.pr} with gh")

    if args.pr is not None:
        head = pr.get("headRefOid")
        # The PR's head may never have been fetched into this checkout, the coordinator's.
        run(["git", "fetch", "--quiet", "origin", f"refs/pull/{args.pr}/head"], cwd)
        if not head or not run_ok(["git", "rev-parse", "--verify", "--quiet", f"{head}^{{commit}}"], cwd):
            fail(f"PR #{args.pr} head {head} is not available after fetching it")
    else:
        head = run_ok(["git", "rev-parse", "HEAD"], cwd)
        if not head:
            fail("HEAD does not name a commit")

    base = args.base or (pr or {}).get("baseRefName")
    if not base and which("gh") is not None:
        base = run_ok(
            ["gh", "repo", "view", "--json", "defaultBranchRef", "--jq", ".defaultBranchRef.name"],
            cwd,
        )
    base = base or "main"

    run(["git", "fetch", "--quiet", "origin", base], cwd)  # best effort; offline keeps the last fetch
    merge_base, base_ref = None, None
    for ref in (f"origin/{base}", base):
        merge_base = run_ok(["git", "merge-base", ref, head], cwd)
        if merge_base:
            base_ref = ref
            break
    if not merge_base:
        fail(f"Could not find a merge-base between {base} and {head}")

    current = range_patch_id(merge_base, head, cwd)

    if args.expect:
        recorded = {"patch_id": args.expect.strip().lower(), "source": "expect"}
    else:
        recorded = recorded_verdict((pr or {}).get("body") or "")

    result = {
        "head": head,
        "base_branch": base,
        "base_ref": base_ref,
        "merge_base": merge_base,
        "patch_id": current,
        "pr": {"number": pr.get("number"), "url": pr.get("url")} if pr else None,
        "recorded": recorded,
        "unchanged": (recorded["patch_id"] == current) if recorded else None,
    }

    if args.resolve:
        span = f"{merge_base}..{head}"
        commits = (run_ok(["git", "rev-list", "--no-merges", span], cwd) or "").split()
        branch = commit_patch_ids([span], cwd)
        result["resolved"] = [
            resolve_commit(sha.strip(), commits, branch, cwd) for sha in args.resolve
        ]

    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
