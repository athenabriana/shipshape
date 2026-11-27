#!/usr/bin/env python3
"""
The companion's watch: one line per change that may need Athena, nothing otherwise.

Part of the companion plugin, Apache License, Version 2.0 (see LICENSE and NOTICE).

Run by the companion service as a child process (`watch-runner.ts`), each stdout line
wakes the companion's agent as an event, and a quiet watch costs no tokens. It looks at two things:

- **Sessions**, every `--interval` seconds, from `sessions.py`: a session that starts
  waiting (a permission prompt or a question dialog), a session that stops on a question,
  and a session that finishes a turn naming a PR.
- **Her PRs**, every `--gh-every` session passes, with one `gh api graphql` call: a PR of
  hers whose CI turns red, one with changes requested, one asking for her review, and one
  ready to merge (CI green and a `Review loop:` verdict line in its description).

Each event is printed once (per head commit, for PR events), and what was seen is kept in
a state file, so a restart or a re-armed monitor does not repeat itself. The first run with
no state file takes a baseline and prints nothing about what already stood, PRs included:
their baseline waits for the first GitHub call that succeeds. A GitHub outage is reported
once, and its end once. Only one watch runs at a time: a second one exits with a
`watch-error` line naming the pid that holds the lock. One failed pass prints a
`watch-error` line and the watch goes on.

Output lines: `<kind> | <subject> | <detail>`, one per event. Kinds: watch-started,
session-waiting, session-asking, session-done, ci-red, changes-requested,
review-requested, merge-ready, github-down, github-back, watch-error.

Usage:
  python3 watch.py [--interval 30] [--gh-every 4] [--state PATH] [--once]
"""

from __future__ import annotations

import argparse
import fcntl
import hashlib
import json
import os
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import github as GH  # noqa: E402
import sessions as S  # noqa: E402

SEEN_TTL = 14 * 24 * 3600  # a PR event not seen again for this long is forgotten
MISSED_PASSES = 10  # a session absent this many passes in a row is forgotten
GH_FAILS_BEFORE_REPORT = 3

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
    # Every field is folded onto one line and masked: a name holding a newline would
    # otherwise print a second, forged event. The bar separates fields, so none carries one.
    parts = [kind, one_line(subject, 80).replace("|", "/"), one_line(detail).replace("|", "/")]
    return " | ".join(p for p in parts if p)


def empty_state() -> dict:
    return {"sessions": {}, "seen": {}, "pr_baseline": True, "gh_down": False}


def load_state(path: Path) -> dict | None:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None
    if not isinstance(data, dict):
        return None
    state = empty_state()
    if isinstance(data.get("sessions"), dict):
        state["sessions"] = {k: v for k, v in data["sessions"].items() if isinstance(v, dict)}
    if isinstance(data.get("seen"), dict):
        state["seen"] = {k: v for k, v in data["seen"].items() if isinstance(v, (int, float))}
    state["pr_baseline"] = data.get("pr_baseline") is True
    state["gh_down"] = data.get("gh_down") is True
    return state


def save_state(path: Path, state: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    tmp = path.with_suffix(".tmp")
    # Created private, so the file is never readable by others, not even for a moment.
    fd = os.open(tmp, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        f.write(json.dumps(state))
    tmp.replace(path)


def digest(text: str) -> str:
    return hashlib.sha256((text or "").encode()).hexdigest()[:16]


def what_it_asks(row: dict) -> str:
    return (row.get("open_question") or {}).get("text") or row.get("last_said") or ""


def session_events(rows: list[dict], previous: dict) -> tuple[list[str], dict]:
    """Events from one pass over the sessions, and the new per-session memory.

    The memory is keyed by the session's ref, which a rename leaves alone. A session missing
    from one pass (its registry file caught mid-write) keeps its memory for a while, so its
    next change is still reported. While a session is busy its last words are not taken in:
    the turn is judged once it ends.
    """
    events: list[str] = []
    memory: dict = {}
    for key, before in previous.items():
        missed = int(before.get("missed", 0)) + 1
        if missed < MISSED_PASSES:
            memory[key] = {**before, "missed": missed}
    for row in rows:
        key = row["ref"] or row["name"]
        said = digest(row.get("last_said") or "")
        before = previous.get(key)
        busy = row["status"] == "busy"
        memory[key] = {
            "status": row["status"],
            "said": before.get("said", said) if (busy and before) else said,
            "missed": 0,
        }
        if before is None:
            continue  # a session seen for the first time sets its own baseline
        name = row["name"]
        if row["status"] == "waiting" and before.get("status") != "waiting":
            events.append(emit("session-waiting", name, what_it_asks(row)))
            continue
        if busy or said == before.get("said"):
            continue
        if row.get("asking"):
            events.append(emit("session-asking", name, what_it_asks(row)))
        elif row.get("prs"):
            events.append(emit("session-done", name, f"{', '.join(row['prs'])}: {row.get('last_said') or ''}"))
    return events, memory


def gh_prs() -> dict:
    data = GH.graphql(PR_QUERY)
    return {
        side: [n for n in ((data.get(side) or {}).get("nodes") or []) if isinstance(n, dict)]
        for side in ("mine", "asked")
    }


def pr_ref(pr: dict) -> str | None:
    repo = (pr.get("repository") or {}).get("nameWithOwner")
    number = pr.get("number")
    return f"{repo}#{number}" if repo and isinstance(number, int) else None


def pr_events(prs: dict, seen: dict, now: float) -> list[str]:
    """Events for what is new, and every key still true refreshed in `seen`."""
    events: list[str] = []

    def once(key: str, line: str) -> None:
        if key not in seen:
            events.append(line)
        seen[key] = now  # still true: keep it, so it never fires again while it holds

    for pr in prs.get("mine", []):
        ref = pr_ref(pr)
        if ref is None:
            continue
        sha = str(pr.get("headRefOid") or "")[:12]
        title = pr.get("title") or ""
        ci = GH.ci_state(pr)
        if ci in ("FAILURE", "ERROR"):
            once(f"ci-red:{ref}:{sha}", emit("ci-red", ref, f"{title} (head {sha[:7]})"))
        if pr.get("reviewDecision") == "CHANGES_REQUESTED":
            once(f"changes:{ref}:{sha}", emit("changes-requested", ref, title))
        verdict = GH.last_verdict(pr.get("body"))
        if ci == "SUCCESS" and not pr.get("isDraft") and verdict:
            once(
                f"ready:{ref}:{sha}",
                emit(
                    "merge-ready",
                    ref,
                    f"{title} (head {sha[:7]}, CI green, review verdict {verdict.group(2)} in {verdict.group(1)} rounds)",
                ),
            )
    for pr in prs.get("asked", []):
        ref = pr_ref(pr)
        if ref is None:
            continue
        author = (pr.get("author") or {}).get("login") or "someone"
        once(f"asked:{ref}", emit("review-requested", ref, f"{pr.get('title') or ''} (by {author})"))
    return events


def take_lock(folder: Path):
    """The lock file's handle while this watch holds it, or None and the holder's pid."""
    folder.mkdir(parents=True, exist_ok=True, mode=0o700)
    handle = open(folder / "watch.lock", "a+")
    try:
        fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError:
        handle.seek(0)
        holder = handle.read().strip()
        handle.close()
        return None, holder
    handle.seek(0)
    handle.truncate()
    handle.write(str(os.getpid()))
    handle.flush()
    return handle, None


def say(lines: list[str]) -> None:
    for line in lines:
        print(line, flush=True)


class Watch:
    def __init__(self, state_path: Path, gh_every: int):
        self.state_path = state_path
        self.gh_every = max(1, gh_every)
        loaded = load_state(state_path)
        self.first_run = loaded is None
        self.state = loaded or empty_state()
        self.saved = json.dumps(self.state)
        self.gh_fails = 0
        self.passes = 0
        self.cache: dict = {}  # transcript stat -> summary, so an unchanged session is not re-read

    def rows(self, home: Path, now: float) -> list[dict]:
        rows = []
        for entry in S.live_sessions(home):
            path = S.transcript_path(home, str(entry.get("cwd") or ""), str(entry.get("sessionId") or ""))
            try:
                stat = path.stat() if path else None
                mark = (stat.st_mtime_ns, stat.st_size) if stat else None
            except OSError:
                mark = None
            key = (entry.get("pid"), entry.get("status"), entry.get("name"), mark)
            row = self.cache.get(entry.get("pid"))
            if row is None or row[0] != key:
                row = (key, S.summarize(entry, home, now, with_branch=False))
                self.cache[entry.get("pid")] = row
            rows.append(row[1])
        live = {e for e in self.cache if any(r is self.cache[e][1] for r in rows)}
        self.cache = {k: v for k, v in self.cache.items() if k in live}
        return rows

    def github(self, now: float, events: list[str]) -> tuple[int, int] | None:
        try:
            prs = GH_PRS()
        except GH.GitHubError as err:
            self.gh_fails += 1
            if self.gh_fails >= GH_FAILS_BEFORE_REPORT and not self.state["gh_down"]:
                self.state["gh_down"] = True
                events.append(emit("github-down", "github", str(err)))
            return None
        self.gh_fails = 0
        if self.state["gh_down"]:
            self.state["gh_down"] = False
            events.append(emit("github-back", "github", "PR checks work again"))
        found = pr_events(prs, self.state["seen"], now)
        if self.state["pr_baseline"] or self.first_run:
            self.state["pr_baseline"] = False  # what already stood is recorded, not printed
        else:
            events += found
        return len(prs["mine"]), len(prs["asked"])

    def step(self, home: Path) -> list[str]:
        now = time.time()
        events: list[str] = []
        rows = self.rows(home, now)
        previous = {} if self.first_run else self.state["sessions"]
        session_lines, self.state["sessions"] = session_events(rows, previous)
        events += session_lines
        counts = None
        if self.passes % self.gh_every == 0:
            if self.first_run:
                self.state["pr_baseline"] = True
            counts = self.github(now, events)
        if self.passes == 0:
            prs = f"{counts[0]} PRs of yours, {counts[1]} asking your review" if counts else "GitHub not reached yet"
            events.insert(0, emit("watch-started", "watch", f"{len(rows)} sessions, {prs}" + (", baseline taken" if self.first_run else "")))
        self.state["seen"] = {k: v for k, v in self.state["seen"].items() if now - v < SEEN_TTL}
        text = json.dumps(self.state)
        if text != self.saved:
            save_state(self.state_path, self.state)
            self.saved = text
        self.first_run = False
        self.passes += 1
        return events


GH_PRS = gh_prs  # a seam the tests replace


def run(args: argparse.Namespace) -> int:
    state_path = Path(args.state) if args.state else state_dir() / "watch.json"
    lock, holder = take_lock(state_path.parent)
    if lock is None:
        say([emit("watch-error", "watch", f"another watch is already running (pid {holder or 'unknown'})")])
        return 1
    watch = Watch(state_path, args.gh_every)
    home = S.claude_home()
    while True:
        try:
            say(watch.step(home))
        except Exception as err:  # one bad pass must not end the watch
            watch.passes += 1
            say([emit("watch-error", "watch", f"a pass failed: {err.__class__.__name__}")])
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
