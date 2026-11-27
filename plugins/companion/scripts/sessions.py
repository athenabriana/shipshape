#!/usr/bin/env python3
"""
What every live Claude Code session on this machine is doing, read from disk.

Part of the companion plugin, Apache License, Version 2.0 (see LICENSE and NOTICE).

Each live session has a registry file, `~/.claude/sessions/<pid>.json`, with its name,
status (idle, busy, waiting, shell), working folder and session id. Its transcript is
`~/.claude/projects/<folder, every non-alphanumeric character turned into ->/<id>.jsonl`.
This script joins the two and prints, per session, what it last said, whether it ends on
a question, and the PRs it mentioned. It only reads: it never writes, and it never opens
the `<pid>.<hash>.key` files that sit in the same folder.

What it prints goes to a phone, so only the text of user and assistant turns is read
(never tool output), every excerpt is cut short, and anything shaped like a secret is
masked.

Usage:
  python3 sessions.py                       {"sessions": [...]}, waiting ones first
  python3 sessions.py show NAME [--turns N] the last N turns of one session, by name or ref

Prints JSON. On failure: {"error": "..."} and exit 1.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import time
from pathlib import Path

EXCERPT = 400
TAIL_BYTES = 400_000  # only the end of a transcript is read; the last turns are what count

# Shapes of secrets that must never reach the chat, even inside a session's own words.
SECRET_PATTERNS = [
    # No leading word boundary: a secret glued to other text is still a secret.
    re.compile(r"\d{6,12}:[A-Za-z0-9_-]{30,}"),  # Telegram bot token
    re.compile(r"gh[pousr]_[A-Za-z0-9]{30,}"),  # GitHub tokens
    re.compile(r"github_pat_[A-Za-z0-9_]{30,}"),
    re.compile(r"(?<![A-Za-z])sk-[A-Za-z0-9_-]{20,}"),  # Anthropic, OpenAI keys (not "task-...")
    re.compile(r"xox[abpors]-[A-Za-z0-9-]{10,}"),  # Slack tokens
    re.compile(r"AKIA[0-9A-Z]{16}"),  # AWS access key id
    re.compile(r"AIza[0-9A-Za-z_-]{35}"),  # Google API key
    re.compile(r"eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}"),  # JWT
    re.compile(r"(?i)\bbearer\s+[A-Za-z0-9._~+/=-]{16,}"),  # Authorization: Bearer ...
    re.compile(r"\b[sr]k_(?:live|test)_[A-Za-z0-9]{16,}"),  # Stripe keys
    re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?(?:-----END [A-Z ]*PRIVATE KEY-----|$)"),
]
# `password: x`, `"token": "x"`, `API_KEY="x"`: the name stays, the value goes. The match
# starts only where a run of name characters starts, so a long run costs one pass, not n.
NAMED_SECRET = re.compile(
    r"(?i)(?<![\w-])([\w-]*?(?:password|passwd|_pass|pass_|pwd|secret|token|api[_-]?key)[\w-]*)"
    r"([\"']?\s*[:=]\s*)(\"[^\"\n]*\"|'[^'\n]*'|[^\s,;]+)"
)
URL_CREDENTIALS = re.compile(r"(\b[a-z][a-z0-9+.-]*://[^/\s:@]+:)[^@\s/]+@", re.IGNORECASE)
PR_URL = re.compile(r"https://github\.com/([\w.-]+/[\w.-]+)/pull/(\d+)")


def claude_home() -> Path:
    return Path(os.environ.get("CLAUDE_CONFIG_DIR") or Path.home() / ".claude")


def redact(text: str) -> str:
    for pattern in SECRET_PATTERNS:
        text = pattern.sub("[hidden]", text)
    text = URL_CREDENTIALS.sub(lambda m: f"{m.group(1)}[hidden]@", text)
    return NAMED_SECRET.sub(lambda m: f"{m.group(1)}{m.group(2)}[hidden]", text)


def excerpt(text: str, limit: int = EXCERPT) -> str:
    # Mask first, then cut: a cut first could split a secret so no pattern sees it. Only a
    # bounded head is masked, far past the cut, so a huge turn costs no more than a short one.
    text = redact(text.strip()[: limit * 4 + 200])
    return text if len(text) <= limit else text[: limit - 1].rstrip() + "…"


def transcript_path(home: Path, cwd: str, session_id: str) -> Path | None:
    # The id names a file: anything but a plain id could walk out of the folder.
    if not re.fullmatch(r"[A-Za-z0-9-]+", session_id or ""):
        return None
    return home / "projects" / re.sub(r"[^A-Za-z0-9]", "-", cwd) / f"{session_id}.jsonl"


def proc_start(pid: int) -> str | None:
    """Field 22 of /proc/<pid>/stat, the process start time, as the registry records it."""
    try:
        stat = Path(f"/proc/{pid}/stat").read_text()
        return stat[stat.rindex(")") + 2 :].split()[19]
    except (OSError, ValueError, IndexError):
        return None


def alive(entry: dict) -> bool:
    pid = entry.get("pid")
    if not isinstance(pid, int) or not 1 < pid < 2**31:
        return False
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    except PermissionError:
        pass
    except (OSError, OverflowError):
        return False
    # A pid can be reused: when the registry recorded the start time, it has to match.
    recorded, now = entry.get("procStart"), proc_start(pid)
    return recorded is None or now is None or str(recorded) == now


def parent_pid(pid: int) -> int | None:
    try:
        stat = Path(f"/proc/{pid}/stat").read_text()
        return int(stat[stat.rindex(")") + 2 :].split()[1])
    except (OSError, ValueError, IndexError):
        pass
    try:  # no /proc (macOS): ask ps
        out = subprocess.run(["ps", "-o", "ppid=", "-p", str(pid)], capture_output=True, text=True, timeout=5)
        return int(out.stdout.strip()) if out.returncode == 0 and out.stdout.strip() else None
    except (OSError, ValueError, subprocess.SubprocessError):
        return None


def ancestor_pids() -> set[int]:
    """This script's ancestors: the session that runs it is one of them. Read from /proc,
    or from ps where /proc is missing."""
    pids: set[int] = set()
    pid: int | None = os.getppid()
    for _ in range(12):
        if pid is None or pid <= 1:
            break
        pids.add(pid)
        pid = parent_pid(pid)
    return pids


def read_registry(home: Path) -> list[dict]:
    out: list[dict] = []
    folder = home / "sessions"
    if not folder.is_dir():
        return out
    for path in folder.iterdir():
        # Only `<pid>.json`. The `<pid>.<hash>.key` files are secrets and are never opened.
        if not re.fullmatch(r"\d+\.json", path.name):
            continue
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            continue
        if isinstance(data, dict) and isinstance(data.get("pid"), int):
            out.append(data)
    return out


def tail_lines(path: Path | None, max_bytes: int = TAIL_BYTES) -> list[str]:
    if path is None:
        return []
    try:
        with path.open("rb") as f:
            f.seek(0, os.SEEK_END)
            size = f.tell()
            f.seek(max(0, size - max_bytes))
            data = f.read()
    except OSError:
        return []
    lines = data.decode("utf-8", errors="replace").splitlines()
    return lines[1:] if size > max_bytes else lines  # the first line may be cut


def turns(lines: list[str]) -> list[dict]:
    """User and assistant turns, text only, plus the open question when there is one."""
    out: list[dict] = []
    open_questions: dict[str, dict] = {}
    for line in lines:
        try:
            entry = json.loads(line)
        except ValueError:
            continue
        if not isinstance(entry, dict):
            continue
        kind = entry.get("type")
        if kind not in ("user", "assistant"):
            continue
        message = entry.get("message")
        content = message.get("content") if isinstance(message, dict) else None
        texts: list[str] = []
        if isinstance(content, str):
            texts.append(content)
        elif isinstance(content, list):
            for block in content:
                if not isinstance(block, dict):
                    continue
                if block.get("type") == "text":
                    texts.append(str(block.get("text", "")))
                elif block.get("type") == "tool_use" and block.get("name") == "AskUserQuestion":
                    open_questions[str(block.get("id", ""))] = block.get("input") or {}
                elif block.get("type") == "tool_result":
                    open_questions.pop(str(block.get("tool_use_id", "")), None)
        text = "\n".join(t for t in texts if t).strip()
        # Hook output, command echoes and system notes are not something anyone said.
        if not text or (kind == "user" and text.startswith("<")):
            continue
        out.append({"role": kind, "text": text, "ts": entry.get("timestamp")})
    if open_questions:
        question = list(open_questions.values())[-1]
        qs = question.get("questions") if isinstance(question, dict) else None
        if isinstance(qs, list) and qs and isinstance(qs[0], dict):
            options = qs[0].get("options") or []
            out.append(
                {
                    "role": "question",
                    "text": str(qs[0].get("question", "")),
                    "options": [str(o.get("label", "")) for o in options if isinstance(o, dict)],
                }
            )
    return out


def git_branch(cwd: str) -> str | None:
    try:
        out = subprocess.run(
            ["git", "-C", cwd, "rev-parse", "--abbrev-ref", "HEAD"],
            capture_output=True,
            text=True,
            timeout=5,
        )
    except (OSError, subprocess.SubprocessError):
        return None
    if out.returncode != 0:
        return None
    return out.stdout.strip() or None


def summarize(
    entry: dict, home: Path, now: float, with_branch: bool = True, all_turns: list[dict] | None = None
) -> dict:
    cwd = str(entry.get("cwd") or "")
    sid = str(entry.get("sessionId") or "")
    if all_turns is None:
        all_turns = turns(tail_lines(transcript_path(home, cwd, sid))) if cwd else []
    said = [t for t in all_turns if t["role"] == "assistant"]
    question = all_turns[-1] if all_turns and all_turns[-1]["role"] == "question" else None
    last = said[-1]["text"] if said else ""
    prs: list[str] = []
    for t in all_turns[-12:]:
        for repo, num in PR_URL.findall(t["text"]):
            ref = f"{repo}#{num}"
            if ref not in prs:
                prs.append(ref)
    updated = entry.get("updatedAt") or entry.get("statusUpdatedAt") or entry.get("startedAt")
    home_dir = str(Path.home())
    out: dict = {
        "name": str(entry.get("name") or "(unnamed)"),
        "ref": sid[:6],
        "status": str(entry.get("status") or "unknown"),
        "app": "desktop" if entry.get("hostSessionId") else "terminal",
        "folder": "~" + cwd[len(home_dir) :] if cwd.startswith(home_dir) else cwd,
        "minutes_since_update": round((now - updated / 1000) / 60)
        if isinstance(updated, (int, float))
        else None,
        "last_said": excerpt(last) if last else None,
        "asking": bool(question) or last.rstrip().endswith("?"),
        "prs": prs[-5:],
    }
    if question:
        out["open_question"] = {
            "text": excerpt(question["text"]),
            "options": [excerpt(o, 80) for o in question["options"]],
        }
    if with_branch and cwd:
        out["branch"] = git_branch(cwd)
    return out


def live_sessions(home: Path, exclude: set[int] | None = None) -> list[dict]:
    own = ancestor_pids() if exclude is None else exclude
    return [e for e in read_registry(home) if e["pid"] not in own and alive(e)]


def find(entries: list[dict], key: str) -> dict | None:
    """One session by exact name, then by ref, then by a part of its name."""
    key_l = key.strip().lower()
    if not key_l:
        return None
    for match in (
        lambda e: str(e.get("name") or "").lower() == key_l,
        lambda e: str(e.get("sessionId") or "").lower().startswith(key_l),
        lambda e: key_l in str(e.get("name") or "").lower(),
    ):
        hits = [e for e in entries if match(e)]
        if len(hits) == 1:
            return hits[0]
        if len(hits) > 1:
            return None
    return None


def show(entry: dict, home: Path, now: float, count: int) -> dict:
    lines = tail_lines(transcript_path(home, str(entry.get("cwd") or ""), str(entry.get("sessionId") or "")))
    all_turns = turns(lines)
    recent = all_turns[-max(1, min(count, 30)) :]
    rows = []
    for t in recent:
        row = {"role": t["role"], "text": excerpt(t["text"], 1500), "ts": t.get("ts")}
        if "options" in t:
            row["options"] = [excerpt(o, 80) for o in t["options"]]
        rows.append(row)
    return {"session": summarize(entry, home, now, all_turns=all_turns), "turns": rows}


def main() -> None:
    parser = argparse.ArgumentParser(description="What every live Claude Code session is doing.")
    sub = parser.add_subparsers(dest="cmd")
    show_cmd = sub.add_parser("show", help="the last turns of one session")
    show_cmd.add_argument("name")
    show_cmd.add_argument("--turns", type=int, default=6)
    args = parser.parse_args()

    home = claude_home()
    now = time.time()
    entries = live_sessions(home)
    if args.cmd == "show":
        entry = find(entries, args.name)
        if entry is None:
            print(json.dumps({"error": f"no single live session matches {args.name!r}"}))
            sys.exit(1)
        print(json.dumps(show(entry, home, now, args.turns), ensure_ascii=False))
        return
    rows = sorted(
        (summarize(e, home, now) for e in entries),
        key=lambda r: (r["status"] != "waiting", not r["asking"], r["minutes_since_update"] or 0),
    )
    print(json.dumps({"sessions": rows}, ensure_ascii=False))


if __name__ == "__main__":
    main()
