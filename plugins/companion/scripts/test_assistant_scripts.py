"""Unit tests for the assistant's scripts: sessions.py, watch.py and merge_gate.py."""

from __future__ import annotations

import json
import os
import sys
import tempfile
import time
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
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
            "xoxb-1234567890-abc",
            "AKIA" + "A" * 16,
            "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0In0.abcdefghijklmn",
        ]:
            self.assertNotIn(secret, S.redact(f"here: {secret} end"), secret)

    def test_named_secret_keeps_name(self):
        out = S.redact('API_KEY="hunter22" and password: swordfish')
        self.assertIn("API_KEY=[hidden]", out)
        self.assertIn("password: [hidden]", out)
        self.assertNotIn("swordfish", out)

    def test_private_key_block(self):
        out = S.redact("-----BEGIN RSA PRIVATE KEY-----\nabc\n-----END RSA PRIVATE KEY-----")
        self.assertEqual(out, "[hidden]")

    def test_excerpt_masks_before_cutting(self):
        token = "ghp_" + "z" * 36
        out = S.excerpt("x" * 10 + token, 20)
        self.assertNotIn("ghp_zzz", out)


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
        ]
        got = S.turns(lines)
        self.assertEqual([t["text"] for t in got], ["oi", "Pronto."])

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
        got = S.read_registry(self.home)
        self.assertEqual([e["name"] for e in got], ["a"])

    def test_live_excludes_self_and_dead(self):
        me = os.getpid()
        self.write(f"{me}.json", {"pid": me, "name": "me"})
        self.write("999999.json", {"pid": 999999, "name": "dead"})
        self.assertEqual(S.live_sessions(self.home, exclude={me}), [])
        self.assertEqual([e["name"] for e in S.live_sessions(self.home, exclude=set())], ["me"])

    def test_summarize_reads_transcript(self):
        cwd = "/w/repo"
        sid = "abc123"
        folder = self.home / "projects" / "-w-repo"
        folder.mkdir(parents=True)
        (folder / f"{sid}.jsonl").write_text(
            "\n".join(
                [
                    line("user", "faz o PR"),
                    line("assistant", [{"type": "text", "text": "Abri https://github.com/o/r/pull/7. Faço o merge?"}]),
                ]
            )
        )
        row = S.summarize(
            {"pid": 1, "name": "work", "status": "idle", "cwd": cwd, "sessionId": sid, "updatedAt": time.time() * 1000},
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


def row(name="s", status="idle", said="", asking=False, prs=None, question=None):
    r = {"name": name, "ref": "abc", "status": status, "last_said": said, "asking": asking, "prs": prs or []}
    if question:
        r["open_question"] = {"text": question, "options": []}
    return r


class SessionEvents(unittest.TestCase):
    def test_first_sight_is_silent(self):
        events, memory = W.session_events([row(status="waiting")], {})
        self.assertEqual(events, [])
        self.assertIn("s#abc", memory)

    def test_waiting_once(self):
        _, mem = W.session_events([row(status="busy")], {})
        events, mem = W.session_events([row(status="waiting", question="Allow Bash?")], mem)
        self.assertEqual(events, ["session-waiting | s | Allow Bash?"])
        events, _ = W.session_events([row(status="waiting", question="Allow Bash?")], mem)
        self.assertEqual(events, [])

    def test_asking_and_done(self):
        _, mem = W.session_events([row(status="busy", said="working")], {})
        events, mem2 = W.session_events([row(said="Posso mesclar?", asking=True)], mem)
        self.assertEqual(events, ["session-asking | s | Posso mesclar?"])
        events, _ = W.session_events([row(said="PR aberto", prs=["o/r#1"])], mem)
        self.assertEqual(events[0].split(" | ")[0], "session-done")
        events, _ = W.session_events([row(said="só terminei")], mem)
        self.assertEqual(events, [])  # done without a PR is not worth waking for

    def test_bar_in_detail_is_neutralized(self):
        _, mem = W.session_events([row(status="busy")], {})
        events, _ = W.session_events([row(status="waiting", question="a | b")], mem)
        self.assertEqual(events[0].count(" | "), 2)


def pr(number=1, ci="SUCCESS", body="", draft=False, decision=None, sha=SHA, author="x"):
    return {
        "number": number,
        "title": "t",
        "url": "u",
        "isDraft": draft,
        "headRefOid": sha,
        "body": body,
        "reviewDecision": decision,
        "repository": {"nameWithOwner": "o/r"},
        "author": {"login": author},
        "commits": {"nodes": [{"commit": {"statusCheckRollup": {"state": ci}}}]},
    }


class PrEvents(unittest.TestCase):
    def test_kinds_and_once(self):
        verdict = f"Review loop: 2 rounds, verdict clean, patch-id {PATCH}."
        prs = {
            "mine": [pr(1, ci="FAILURE"), pr(2, body=verdict), pr(3, decision="CHANGES_REQUESTED"), pr(4)],
            "asked": [pr(5, author="ana")],
        }
        seen: dict = {}
        events = W.pr_events(prs, seen, 1.0)
        kinds = sorted(e.split(" | ")[0] for e in events)
        self.assertEqual(kinds, ["changes-requested", "ci-red", "merge-ready", "review-requested"])
        self.assertEqual(W.pr_events(prs, seen, 2.0), [])

    def test_new_head_fires_again(self):
        seen: dict = {}
        W.pr_events({"mine": [pr(1, ci="FAILURE")], "asked": []}, seen, 1.0)
        again = W.pr_events({"mine": [pr(1, ci="FAILURE", sha="c" * 40)], "asked": []}, seen, 2.0)
        self.assertEqual(len(again), 1)

    def test_draft_or_red_is_not_ready(self):
        verdict = f"Review loop: 1 round, verdict clean, patch-id {PATCH}."
        events = W.pr_events({"mine": [pr(1, body=verdict, draft=True), pr(2, body=verdict, ci="PENDING")], "asked": []}, {}, 1.0)
        self.assertEqual(events, [])


class WatchRun(unittest.TestCase):
    def test_lock_allows_one(self):
        with tempfile.TemporaryDirectory() as d:
            first = W.take_lock(Path(d))
            self.assertIsNotNone(first)
            self.assertIsNone(W.take_lock(Path(d)))
            first.close()
            self.assertIsNotNone(W.take_lock(Path(d)))

    def test_state_round_trip_private(self):
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / "sub" / "w.json"
            W.save_state(path, {"sessions": {}, "seen": {"k": 1}})
            self.assertEqual(W.load_state(path)["seen"], {"k": 1})
            self.assertEqual(path.stat().st_mode & 0o777, 0o600)
            path.write_text("[]")
            self.assertIsNone(W.load_state(path))


def repo_data(ci="SUCCESS", body="", state="OPEN", draft=False, merge_state="CLEAN", squash=True):
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


VERDICT = f"Review loop: 2 rounds, verdict clean, patch-id {PATCH}."


class Gate(unittest.TestCase):
    def test_passes_with_everything(self):
        got = G.judge("o/r", 9, repo_data(body=VERDICT), {"head": SHA, "unchanged": True}, None)
        self.assertTrue(got["ok"], got["reasons"])
        self.assertEqual(got["merge_command"], f"gh pr merge 9 --repo o/r --squash --match-head-commit {SHA}")

    def test_each_failure_blocks_and_hides_command(self):
        cases = [
            (repo_data(body=VERDICT, ci="FAILURE"), {"head": SHA, "unchanged": True}, None),
            (repo_data(body=VERDICT, draft=True), {"head": SHA, "unchanged": True}, None),
            (repo_data(body=VERDICT, state="MERGED"), {"head": SHA, "unchanged": True}, None),
            (repo_data(body=VERDICT, merge_state="BLOCKED"), {"head": SHA, "unchanged": True}, None),
            (repo_data(body=""), {"head": SHA, "unchanged": None}, None),
            (repo_data(body=VERDICT.replace("clean", "open")), {"head": SHA, "unchanged": True}, None),
            (repo_data(body=VERDICT), {"head": SHA, "unchanged": False}, None),
            (repo_data(body=VERDICT), {"head": "c" * 40, "unchanged": True}, None),
            (repo_data(body=VERDICT), None, "no local clone"),
        ]
        for data, patch, err in cases:
            got = G.judge("o/r", 9, data, patch, err)
            self.assertFalse(got["ok"], (data["pullRequest"], patch, err))
            self.assertIsNone(got["merge_command"])
            self.assertTrue(got["reasons"])

    def test_no_verdict_gives_one_reason(self):
        got = G.judge("o/r", 9, repo_data(body=""), {"head": SHA, "unchanged": None}, None)
        self.assertEqual(len(got["reasons"]), 1)

    def test_merge_method_fallback(self):
        got = G.judge("o/r", 9, repo_data(body=VERDICT, squash=False), {"head": SHA, "unchanged": True}, None)
        self.assertIn("--merge", got["merge_command"])

    def test_repo_pattern(self):
        self.assertTrue(G.REPO_RE.match("athenabriana/shipshape"))
        for bad in ["a", "a/b/c", "a/b; rm -rf /", "-x/y z"]:
            self.assertFalse(G.REPO_RE.match(bad), bad)


if __name__ == "__main__":
    unittest.main()
