#!/usr/bin/env python3
"""
The companion's watch: one line per change that may need Athena, nothing otherwise.

Part of the companion plugin, Apache License, Version 2.0 (see LICENSE and NOTICE).

Run under Claude Code's `Monitor` tool, each stdout line wakes the companion session as
an event, and a quiet watch costs no tokens. It looks at two things:

- **Sessions**, every `--interval` seconds, from `sessions.py`: a session that starts
  waiting (a permission prompt or a question dialog), a session that stops on a question,
  and a session that finishes a turn naming a PR.
- **Her PRs**, every `--gh-every` session passes, with one `gh api graphql` call: a PR of
  hers whose CI turns red, one with changes requested, one asking for her review, and one
  ready to merge (CI green and a `Review loop:` verdict line in its description).

Each event is printed once (per head commit, for PR events), and what was seen is kept
in a state file, so a restart or a re-armed monitor does not repeat itself. The first run
with no state file takes a baseline and prints nothing about what already stood. Only one
watch runs at a time: a second one exits with a `watch-error` line.

Output lines: `<kind> | <subject> | <detail>`, one per event. Kinds: watch-started,
session-waiting, session-asking, session-done, ci-red, changes-requested,
review-requested, merge-ready, watch-error.

Usage:
  python3 watch.py [--interval 30] [--gh-every 4] [--state PATH] [--once]
"""

from __future__ import annotations

import argparse
import fcntl
import hashlib
import json
import os
import re
import subprocess
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import sessions as S  # noqa: E402

VERDICT_LINE = re.compile(r"Review loop: (\d+) rounds?, verdict (\w+), patch-id ([0-9a-f]{40,64})")
SEEN_TTL = 14 * 24 * 3600
GH_FAILS_BEFORE_REPORT = 5

PR_QUERY = """
query {
  mine: search(query: "is:pr is:open archived:false author:@me", type: ISSUE, first: 50) {
    nodes { ...F }
  }
  asked: search(query: "is:pr is:open archived:false review-requested:@me", type: ISSUE, first: 50) {
    nodes { ...F }
  }
}
fragment F on PullRequest {
  number title url isDraft headRefOid body reviewDecision
  repository { nameWithOwner }
  author { login }
  commits(last: 1) { nodes { commit { statusCheckRollup { state } } } }
}
"""


def state_dir() -> Path:
    base = os.environ.get("XDG_STATE_HOME") or str(Path.home() / ".local" / "state")
    return Path(base) / "companion-assistant"


def one_line(text: str, limit: int = 160) -> str:
    return S.excerpt(" ".join((text or "").split()), limit)


def emit(kind: str, subject: str, detail: str = "") -> str:
    # The bar separates the fields, so none of them may carry one.
    parts = [kind, subject.replace("|", "/"), detail.replace("|", "/")]
    return " | ".join(p for p in parts if p)


def load_state(path: Path) -> dict | None:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None
    if not isinstance(data, dict):
        return None
    data.setdefault("sessions", {})
    data.setdefault("seen", {})
    return data


def save_state(path: Path, state: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(state), encoding="utf-8")
    os.chmod(tmp, 0o600)
    tmp.replace(path)


def digest(text: str) -> str:
    return hashlib.sha256((text or "").encode()).hexdigest()[:16]


def session_events(rows: list[dict], previous: dict) -> tuple[list[str], dict]:
    """Events from one pass over the sessions, and the new per-session memory."""
    events: list[str] = []
    memory: dict = {}
    for row in rows:
        key = f"{row['name']}#{row['ref']}"
        said = digest(row.get("last_said") or "")
        before = previous.get(key)
        memory[key] = {"status": row["status"], "said": said}
        if before is None:
            continue  # a session seen for the first time sets its own baseline
        name = row["name"]
        if row["status"] == "waiting" and before.get("status") != "waiting":
            what = row.get("open_question", {}).get("text") or row.get("last_said") or ""
            events.append(emit("session-waiting", name, one_line(what)))
            continue
        if said == before.get("said") or row["status"] == "busy":
            continue
        if row.get("asking"):
            what = row.get("open_question", {}).get("text") or row.get("last_said") or ""
            events.append(emit("session-asking", name, one_line(what)))
        elif before.get("status") == "busy" and row.get("prs"):
            events.append(emit("session-done", name, f"{', '.join(row['prs'])}: {one_line(row.get('last_said') or '', 120)}"))
    return events, memory


def gh_prs() -> dict:
    out = subprocess.run(
        ["gh", "api", "graphql", "-f", f"query={PR_QUERY}"],
        capture_output=True,
        text=True,
        timeout=60,
    )
    if out.returncode != 0:
        raise RuntimeError(one_line(out.stderr or "gh failed", 200))
    data = json.loads(out.stdout).get("data") or {}
    return {
        "mine": [n for n in (data.get("mine") or {}).get("nodes") or [] if n],
        "asked": [n for n in (data.get("asked") or {}).get("nodes") or [] if n],
    }


def ci_state(pr: dict) -> str | None:
    nodes = (pr.get("commits") or {}).get("nodes") or []
    if not nodes:
        return None
    rollup = ((nodes[-1] or {}).get("commit") or {}).get("statusCheckRollup") or {}
    return rollup.get("state")


def pr_events(prs: dict, seen: dict, now: float) -> list[str]:
    events: list[str] = []

    def once(key: str, line: str) -> None:
        if key not in seen:
            seen[key] = now
            events.append(line)

    for pr in prs.get("mine", []):
        ref = f"{pr['repository']['nameWithOwner']}#{pr['number']}"
        sha = (pr.get("headRefOid") or "")[:12]
        title = one_line(pr.get("title") or "", 90)
        ci = ci_state(pr)
        if ci in ("FAILURE", "ERROR"):
            once(f"ci-red:{ref}:{sha}", emit("ci-red", ref, f"{title} (head {sha[:7]})"))
        if pr.get("reviewDecision") == "CHANGES_REQUESTED":
            once(f"changes:{ref}:{sha}", emit("changes-requested", ref, title))
        verdicts = list(VERDICT_LINE.finditer(pr.get("body") or ""))
        if ci == "SUCCESS" and not pr.get("isDraft") and verdicts:
            v = verdicts[-1]
            once(
                f"ready:{ref}:{sha}",
                emit("merge-ready", ref, f"{title} (head {sha[:7]}, CI green, review verdict {v.group(2)} in {v.group(1)} rounds)"),
            )
    for pr in prs.get("asked", []):
        ref = f"{pr['repository']['nameWithOwner']}#{pr['number']}"
        author = ((pr.get("author") or {}).get("login")) or "someone"
        once(f"asked:{ref}", emit("review-requested", ref, f"{one_line(pr.get('title') or '', 90)} (by {author})"))
    return events


def take_lock(folder: Path):
    folder.mkdir(parents=True, exist_ok=True, mode=0o700)
    handle = open(folder / "watch.lock", "a+")
    try:
        fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError:
        handle.close()
        return None
    return handle


def say(lines: list[str]) -> None:
    for line in lines:
        print(line, flush=True)


def run(args: argparse.Namespace) -> int:
    state_path = Path(args.state) if args.state else state_dir() / "watch.json"
    lock = take_lock(state_path.parent)
    if lock is None:
        say([emit("watch-error", "watch", "another watch is already running")])
        return 1
    state = load_state(state_path)
    baseline = state is None
    state = state or {"sessions": {}, "seen": {}}
    home = S.claude_home()
    gh_fails = 0
    passes = 0
    while True:
        now = time.time()
        rows = [S.summarize(e, home, now, with_branch=False) for e in S.live_sessions(home)]
        events, state["sessions"] = session_events(rows, {} if baseline else state["sessions"])
        if passes % max(1, args.gh_every) == 0:
            try:
                prs = gh_prs()
                gh_fails = 0
                found = pr_events(prs, state["seen"], now)
                if not baseline:
                    events += found
                if passes == 0:
                    events.insert(
                        0,
                        emit(
                            "watch-started",
                            "watch",
                            f"{len(rows)} sessions, {len(prs['mine'])} PRs of yours, {len(prs['asked'])} asking your review"
                            + (", baseline taken" if baseline else ""),
                        ),
                    )
            except (OSError, ValueError, RuntimeError, subprocess.SubprocessError) as err:
                gh_fails += 1
                if passes == 0:
                    events.insert(0, emit("watch-started", "watch", f"{len(rows)} sessions, GitHub not reached yet"))
                if gh_fails == GH_FAILS_BEFORE_REPORT:
                    events.append(emit("watch-error", "github", str(err)))
        state["seen"] = {k: v for k, v in state["seen"].items() if now - v < SEEN_TTL}
        save_state(state_path, state)
        say(events)
        baseline = False
        passes += 1
        if args.once:
            return 0
        time.sleep(max(5, args.interval))


def main() -> None:
    parser = argparse.ArgumentParser(description="The companion's watch.")
    parser.add_argument("--interval", type=int, default=30, help="seconds between session passes")
    parser.add_argument("--gh-every", type=int, default=4, help="check GitHub every N passes")
    parser.add_argument("--state", help="state file (default: ~/.local/state/companion-assistant/watch.json)")
    parser.add_argument("--once", action="store_true", help="one pass, then exit")
    sys.exit(run(parser.parse_args()))


if __name__ == "__main__":
    main()
