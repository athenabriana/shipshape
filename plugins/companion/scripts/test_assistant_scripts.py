"""Unit tests for the assistant's scripts: sessions.py, github.py, watch.py, merge_gate.py."""

from __future__ import annotations

import json
import os
import sys
import tempfile
import time
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import github as GH  # noqa: E402
import merge_gate as G  # noqa: E402
import sessions as S  # noqa: E402
import watch as W  # noqa: E402

SHA = "a" * 40
PATCH = "b" * 40


def line(kind: str, content) -> str:
    return json.dumps({"type": kind, "timestamp": "2026-11-27T04:00:00Z", "message": {"content": content}})


class Redact(unittest.TestCase):
    def test_masks_token_shapes(self):
        for secret in [
            "123456789:AAHabcdefghijklmnopqrstuvwxyz0123456",
            "ghp_" + "a" * 36,
            "github_pat_" + "a" * 40,
            "sk-ant-" + "a" * 30,
            "sk_live_" + "a" * 24,
            "xoxb-1234567890-abc",
            "AKIA" + "A" * 16,
            "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0In0.abcdefghijklmn",
            "Bearer abcdefghijklmnop1234",
        ]:
            self.assertNotIn(secret, S.redact(f"here: {secret} end"), secret)

    def test_named_secret_keeps_name(self):
        out = S.redact('API_KEY="hunter22" and password: swordfish, {"token": "zzz9"} DB_PASS=qq')
        self.assertIn("API_KEY=[hidden]", out)
        self.assertIn("password: [hidden]", out)
        for value in ["hunter22", "swordfish", "zzz9", "qq"]:
            self.assertNotIn(value, out)

    def test_url_credentials(self):
        self.assertEqual(S.redact("postgres://admin:S3cret@db/x"), "postgres://admin:[hidden]@db/x")

    def test_plain_words_survive(self):
        for text in ["task-list for the passage", "tests passed: 12", "bypass=true", "compass: north"]:
            self.assertEqual(S.redact(text), text)

    def test_private_key_block(self):
        out = S.redact("-----BEGIN RSA PRIVATE KEY-----\nabc\n-----END RSA PRIVATE KEY-----")
        self.assertEqual(out, "[hidden]")

    def test_excerpt_masks_before_cutting(self):
        out = S.excerpt("x" * 10 + "ghp_" + "z" * 36, 20)
        self.assertNotIn("ghp_zzz", out)

    def test_long_hyphen_runs_stay_fast(self):
        text = "-".join(str(i) for i in range(20000))
        start = time.time()
        S.redact(text)
        S.excerpt(text * 5)
        self.assertLess(time.time() - start, 2.0)


class Transcript(unittest.TestCase):
    def test_path_refuses_odd_ids(self):
        home = Path("/h")
        self.assertIsNone(S.transcript_path(home, "/w", "../../etc/passwd"))
        self.assertEqual(
            S.transcript_path(home, "/home/a/x.y", "abc-123"),
            Path("/h/projects/-home-a-x-y/abc-123.jsonl"),
        )

    def test_turns_skip_tool_output_and_notes(self):
        lines = [
            line("user", "oi"),
            line("user", [{"type": "tool_result", "tool_use_id": "t", "content": "SECRET OUTPUT"}]),
            line("user", "<command-name>/x</command-name>"),
            line("assistant", [{"type": "text", "text": "Pronto."}, {"type": "tool_use", "name": "Bash", "id": "b"}]),
            json.dumps({"type": "assistant", "message": "not a dict"}),
            json.dumps(["not", "an", "entry"]),
        ]
        self.assertEqual([t["text"] for t in S.turns(lines)], ["oi", "Pronto."])

    def test_open_question_until_answered(self):
        ask = {
            "type": "tool_use",
            "name": "AskUserQuestion",
            "id": "q1",
            "input": {"questions": [{"question": "Merge?", "options": [{"label": "Yes"}, {"label": "No"}]}]},
        }
        open_lines = [line("assistant", [{"type": "text", "text": "One thing."}, ask])]
        self.assertEqual(S.turns(open_lines)[-1]["role"], "question")
        self.assertEqual(S.turns(open_lines)[-1]["options"], ["Yes", "No"])
        answered = open_lines + [line("user", [{"type": "tool_result", "tool_use_id": "q1", "content": "Yes"}])]
        self.assertNotIn("question", [t["role"] for t in S.turns(answered)])

    def test_tail_drops_cut_first_line(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "t.jsonl"
            p.write_text("first-long-line\nsecond\nthird\n")
            self.assertEqual(S.tail_lines(p, max_bytes=12), ["third"])


class Registry(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.home = Path(self.dir.name)
        (self.home / "sessions").mkdir()

    def tearDown(self):
        self.dir.cleanup()

    def write(self, name: str, data) -> None:
        (self.home / "sessions" / name).write_text(json.dumps(data) if not isinstance(data, str) else data)

    def test_reads_only_pid_json_and_never_keys(self):
        self.write("100.json", {"pid": 100, "name": "a"})
        self.write("100.abcdef.key", "SECRET")
        self.write("notes.json", {"pid": 1})
        self.write("200.json", "not json")
        self.assertEqual([e["name"] for e in S.read_registry(self.home)], ["a"])

    def test_live_excludes_self_and_dead(self):
        me = os.getpid()
        self.write(f"{me}.json", {"pid": me, "name": "me"})
        self.write("999999.json", {"pid": 999999, "name": "dead"})
        self.assertEqual(S.live_sessions(self.home, exclude={me}), [])
        self.assertEqual([e["name"] for e in S.live_sessions(self.home, exclude=set())], ["me"])

    def test_reused_pid_is_dead(self):
        me = os.getpid()
        self.assertTrue(S.alive({"pid": me}))
        self.assertFalse(S.alive({"pid": 2**40}))
        if S.proc_start(me) is not None:
            self.assertTrue(S.alive({"pid": me, "procStart": S.proc_start(me)}))
            self.assertFalse(S.alive({"pid": me, "procStart": "1"}))

    def test_summarize_reads_transcript(self):
        folder = self.home / "projects" / "-w-repo"
        folder.mkdir(parents=True)
        (folder / "abc123.jsonl").write_text(
            "\n".join(
                [
                    line("user", "faz o PR"),
                    line("assistant", [{"type": "text", "text": "Abri https://github.com/o/r/pull/7. Faço o merge?"}]),
                ]
            )
        )
        row = S.summarize(
            {"pid": 1, "name": "work", "status": "idle", "cwd": "/w/repo", "sessionId": "abc123", "updatedAt": time.time() * 1000},
            self.home,
            time.time(),
            with_branch=False,
        )
        self.assertTrue(row["asking"])
        self.assertEqual(row["prs"], ["o/r#7"])
        self.assertEqual(row["app"], "terminal")

    def test_find(self):
        entries = [{"name": "Shipshape", "sessionId": "aaa111"}, {"name": "Ship docs", "sessionId": "bbb222"}]
        self.assertEqual(S.find(entries, "shipshape")["sessionId"], "aaa111")
        self.assertEqual(S.find(entries, "bbb")["name"], "Ship docs")
        self.assertIsNone(S.find(entries, "ship"))  # two partial matches: no guess
        self.assertIsNone(S.find(entries, ""))


def row(name="s", status="idle", said="", asking=False, prs=None, question=None, ref="abc"):
    r = {"name": name, "ref": ref, "status": status, "last_said": said, "asking": asking, "prs": prs or []}
    if question:
        r["open_question"] = {"text": question, "options": []}
    return r


class SessionEvents(unittest.TestCase):
    def test_first_sight_is_silent(self):
        events, memory = W.session_events([row(status="waiting")], {})
        self.assertEqual(events, [])
        self.assertIn("abc", memory)

    def test_waiting_once(self):
        _, mem = W.session_events([row(status="busy")], {})
        events, mem = W.session_events([row(status="waiting", question="Allow Bash?")], mem)
        self.assertEqual(events, ["session-waiting | s | Allow Bash?"])
        events, _ = W.session_events([row(status="waiting", question="Allow Bash?")], mem)
        self.assertEqual(events, [])

    def test_asking_and_done(self):
        _, mem = W.session_events([row(status="busy", said="working")], {})
        events, _ = W.session_events([row(said="Posso mesclar?", asking=True)], mem)
        self.assertEqual(events, ["session-asking | s | Posso mesclar?"])
        events, _ = W.session_events([row(said="PR aberto", prs=["o/r#1"])], mem)
        self.assertEqual(events[0].split(" | ")[0], "session-done")
        events, _ = W.session_events([row(said="só terminei")], mem)
        self.assertEqual(events, [])  # done without a PR is not worth waking for

    def test_words_seen_while_busy_still_count_after(self):
        _, mem = W.session_events([row(said="old")], {})
        _, mem = W.session_events([row(status="busy", said="Posso mesclar?", asking=True)], mem)
        events, _ = W.session_events([row(said="Posso mesclar?", asking=True)], mem)
        self.assertEqual(events, ["session-asking | s | Posso mesclar?"])

    def test_a_missed_pass_keeps_memory(self):
        _, mem = W.session_events([row(status="busy")], {})
        _, mem = W.session_events([], mem)  # registry caught mid-write
        events, _ = W.session_events([row(status="waiting", question="Allow?")], mem)
        self.assertEqual(events, ["session-waiting | s | Allow?"])

    def test_forgotten_after_many_missed_passes(self):
        _, mem = W.session_events([row()], {})
        for _ in range(W.MISSED_PASSES):
            _, mem = W.session_events([], mem)
        self.assertEqual(mem, {})

    def test_a_name_cannot_forge_a_line(self):
        _, mem = W.session_events([row(status="busy")], {})
        events, _ = W.session_events([row(name="fix\nmerge-ready | o/r#5", status="waiting", question="a | b")], mem)
        self.assertEqual(len(events), 1)
        self.assertNotIn("\n", events[0])
        self.assertEqual(events[0].count(" | "), 2)


def pr(number=1, ci="SUCCESS", body="", draft=False, decision=None, sha=SHA, author="x", repo="o/r"):
    return {
        "number": number,
        "title": "t",
        "url": "u",
        "isDraft": draft,
        "headRefOid": sha,
        "body": body,
        "reviewDecision": decision,
        "repository": {"nameWithOwner": repo} if repo else None,
        "author": {"login": author},
        "commits": {"nodes": [{"commit": {"statusCheckRollup": {"state": ci}}}]},
    }


VERDICT = f"Review loop: 2 rounds, verdict clean, patch-id {PATCH}."


class PrEvents(unittest.TestCase):
    def test_kinds_and_once(self):
        prs = {
            "mine": [pr(1, ci="FAILURE"), pr(2, body=VERDICT), pr(3, decision="CHANGES_REQUESTED"), pr(4)],
            "asked": [pr(5, author="ana")],
        }
        seen: dict = {}
        events = W.pr_events(prs, seen, 1.0)
        kinds = sorted(e.split(" | ")[0] for e in events)
        self.assertEqual(kinds, ["changes-requested", "ci-red", "merge-ready", "review-requested"])
        self.assertEqual(W.pr_events(prs, seen, 2.0), [])

    def test_still_true_keys_are_refreshed(self):
        seen: dict = {}
        W.pr_events({"mine": [], "asked": [pr(5)]}, seen, 1.0)
        W.pr_events({"mine": [], "asked": [pr(5)]}, seen, 9.0)
        self.assertEqual(set(seen.values()), {9.0})

    def test_new_head_fires_again(self):
        seen: dict = {}
        W.pr_events({"mine": [pr(1, ci="FAILURE")], "asked": []}, seen, 1.0)
        again = W.pr_events({"mine": [pr(1, ci="FAILURE", sha="c" * 40)], "asked": []}, seen, 2.0)
        self.assertEqual(len(again), 1)

    def test_draft_or_pending_is_not_ready_and_odd_nodes_are_skipped(self):
        events = W.pr_events(
            {"mine": [pr(1, body=VERDICT, draft=True), pr(2, body=VERDICT, ci="PENDING"), pr(3, repo=None)], "asked": []},
            {},
            1.0,
        )
        self.assertEqual(events, [])


class WatchRun(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.path = Path(self.dir.name) / "w.json"
        self.home = Path(self.dir.name) / "home"
        (self.home / "sessions").mkdir(parents=True)
        self.real = W.GH_PRS

    def tearDown(self):
        W.GH_PRS = self.real
        self.dir.cleanup()

    def test_lock_allows_one(self):
        first, _ = W.take_lock(Path(self.dir.name))
        self.assertIsNotNone(first)
        second, holder = W.take_lock(Path(self.dir.name))
        self.assertIsNone(second)
        self.assertEqual(holder, str(os.getpid()))
        first.close()
        third, _ = W.take_lock(Path(self.dir.name))
        self.assertIsNotNone(third)
        third.close()

    def test_state_round_trip_private_and_typed(self):
        W.save_state(self.path, {"sessions": {}, "seen": {"k": 1}, "pr_baseline": False, "gh_down": False})
        self.assertEqual(W.load_state(self.path)["seen"], {"k": 1})
        self.assertEqual(self.path.stat().st_mode & 0o777, 0o600)
        self.path.write_text(json.dumps({"sessions": [], "seen": {"k": "x", "j": 2}}))
        loaded = W.load_state(self.path)
        self.assertEqual(loaded["sessions"], {})
        self.assertEqual(loaded["seen"], {"j": 2})
        self.path.write_text("[]")
        self.assertIsNone(W.load_state(self.path))

    def test_baseline_waits_for_github_and_outage_is_said_once(self):
        calls = {"n": 0}
        red = {"mine": [pr(1, ci="FAILURE")], "asked": []}

        def flaky():
            calls["n"] += 1
            if calls["n"] <= W.GH_FAILS_BEFORE_REPORT:
                raise GH.GitHubError("offline")
            return red

        W.GH_PRS = flaky
        watch = W.Watch(self.path, gh_every=1)
        lines = []
        for _ in range(W.GH_FAILS_BEFORE_REPORT + 1):
            lines += watch.step(self.home)
        kinds = [x.split(" | ")[0] for x in lines]
        self.assertEqual(kinds.count("github-down"), 1)
        self.assertEqual(kinds.count("github-back"), 1)
        self.assertNotIn("ci-red", kinds)  # it already stood: baseline, not news
        W.GH_PRS = lambda: {"mine": [pr(1, ci="FAILURE"), pr(2, ci="FAILURE")], "asked": []}
        self.assertEqual([x.split(" | ")[0] for x in watch.step(self.home)], ["ci-red"])

    def test_a_restarted_watch_does_not_repeat(self):
        W.GH_PRS = lambda: {"mine": [pr(1, ci="FAILURE")], "asked": []}
        W.Watch(self.path, gh_every=1).step(self.home)
        again = W.Watch(self.path, gh_every=1).step(self.home)
        self.assertEqual([x.split(" | ")[0] for x in again], ["watch-started"])


def repo_data(ci="SUCCESS", body=VERDICT, state="OPEN", draft=False, merge_state="CLEAN", squash=True):
    return {
        "squashMergeAllowed": squash,
        "mergeCommitAllowed": True,
        "rebaseMergeAllowed": False,
        "pullRequest": {
            "number": 9,
            "url": "u",
            "title": "t",
            "state": state,
            "isDraft": draft,
            "headRefOid": SHA,
            "body": body,
            "mergeStateStatus": merge_state,
            "commits": {"nodes": [{"commit": {"oid": SHA, "statusCheckRollup": {"state": ci}}}]},
        },
    }


def patch(head=SHA, unchanged=True, recorded=PATCH):
    return {"head": head, "unchanged": unchanged, "recorded": {"patch_id": recorded}}


class Gate(unittest.TestCase):
    def test_passes_with_everything(self):
        got = G.judge("o/r", 9, repo_data(), patch(), None)
        self.assertTrue(got["ok"], got["reasons"])
        self.assertEqual(got["merge_command"], f"gh pr merge 9 --repo o/r --squash --match-head-commit {SHA}")

    def test_goal_status_from_5_13(self):
        done = VERDICT[:-1] + ", goals 4 of 4 achieved."
        self.assertTrue(G.judge("o/r", 9, repo_data(body=done), patch(), None)["ok"])
        deferred = VERDICT[:-1] + ", goals 3 of 4 achieved, G4 deferred."
        self.assertTrue(G.judge("o/r", 9, repo_data(body=deferred), patch(), None)["ok"])
        left = VERDICT[:-1] + ", goals 3 of 4 achieved, G2 open."
        got = G.judge("o/r", 9, repo_data(body=left), patch(), None)
        self.assertFalse(got["ok"])
        self.assertEqual(got["goals"], "3 of 4 achieved, G2 open")

    def test_each_failure_blocks_and_hides_command(self):
        cases = [
            (repo_data(ci="FAILURE"), patch(), None),
            (repo_data(draft=True), patch(), None),
            (repo_data(state="MERGED"), patch(), None),
            (repo_data(merge_state="BLOCKED"), patch(), None),
            (repo_data(body=""), patch(unchanged=None), None),
            (repo_data(body=VERDICT.replace("clean", "open")), patch(), None),
            (repo_data(), patch(unchanged=False), None),
            (repo_data(), patch(head="c" * 40), None),
            (repo_data(), patch(recorded="d" * 40), None),  # the body changed between the reads
            (repo_data(), None, "no local clone"),
        ]
        for data, p, err in cases:
            got = G.judge("o/r", 9, data, p, err)
            self.assertFalse(got["ok"], (data["pullRequest"], p, err))
            self.assertIsNone(got["merge_command"])
            self.assertTrue(got["reasons"])

    def test_no_verdict_gives_one_reason(self):
        got = G.judge("o/r", 9, repo_data(body=""), patch(unchanged=None), None)
        self.assertEqual(len(got["reasons"]), 1)

    def test_merge_method_fallback(self):
        got = G.judge("o/r", 9, repo_data(squash=False), patch(), None)
        self.assertIn("--merge", got["merge_command"])

    def test_title_is_masked(self):
        data = repo_data()
        data["pullRequest"]["title"] = "leak ghp_" + "x" * 36
        self.assertNotIn("ghp_xxx", G.judge("o/r", 9, data, patch(), None)["title"])

    def test_repo_pattern(self):
        self.assertTrue(G.REPO_RE.match("athenabriana/shipshape"))
        for bad in ["a", "a/b/c", "a/b; rm -rf /", "x/y z"]:
            self.assertFalse(G.REPO_RE.match(bad), bad)


class GitHubShared(unittest.TestCase):
    def test_goals_left(self):
        self.assertIsNone(GH.goals_left(None))
        self.assertIsNone(GH.goals_left("none"))
        self.assertIsNone(GH.goals_left("4 of 4 achieved"))
        self.assertIsNone(GH.goals_left("3 of 4 achieved, G4 deferred"))
        self.assertEqual(GH.goals_left("3 of 4 achieved, G2 open"), "3 of 4 achieved, G2 open")
        self.assertEqual(GH.goals_left("2 of 3 achieved"), "2 of 3 achieved")

    def test_verdict_line_with_and_without_goals(self):
        old = GH.last_verdict(f"x\n{VERDICT}\n")
        self.assertEqual((old.group(2), old.group(3), old.group(4)), ("clean", PATCH, None))
        new = GH.last_verdict(f"{VERDICT[:-1]}, goals 4 of 4 achieved.\nmore")
        self.assertEqual(new.group(4), "4 of 4 achieved")

    def test_ci_state_tolerates_odd_shapes(self):
        self.assertIsNone(GH.ci_state({}))
        self.assertIsNone(GH.ci_state({"commits": {"nodes": [None]}}))
        self.assertEqual(GH.ci_state(pr(ci="FAILURE")), "FAILURE")


if __name__ == "__main__":
    unittest.main()
