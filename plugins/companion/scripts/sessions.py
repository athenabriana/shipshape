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
    re.compile(r"\b\d{8,10}:[A-Za-z0-9_-]{35}\b"),  # Telegram bot token
    re.compile(r"\bgh[pousr]_[A-Za-z0-9]{30,}\b"),  # GitHub tokens
    re.compile(r"\bgithub_pat_[A-Za-z0-9_]{30,}\b"),
    re.compile(r"\bsk-[A-Za-z0-9_-]{20,}\b"),  # Anthropic and OpenAI style keys
    re.compile(r"\bxox[abpors]-[A-Za-z0-9-]{10,}\b"),  # Slack tokens
    re.compile(r"\bAKIA[0-9A-Z]{16}\b"),  # AWS access key id
    re.compile(r"\bAIza[0-9A-Za-z_-]{35}\b"),  # Google API key
    re.compile(r"\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b"),  # JWT
    re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?(?:-----END [A-Z ]*PRIVATE KEY-----|$)"),
]
# `password: x`, `token=x`, `API_KEY="x"`: the name stays, the value goes.
NAMED_SECRET = re.compile(
    r"(?i)\b([\w-]*(?:password|passwd|secret|token|api[_-]?key)[\w-]*)(\s*[:=]\s*)(\"[^\"\n]*\"|'[^'\n]*'|[^\s,;]+)"
)
PR_URL = re.compile(r"https://github\.com/([\w.-]+/[\w.-]+)/pull/(\d+)")


def claude_home() -> Path:
    return Path(os.environ.get("CLAUDE_CONFIG_DIR") or Path.home() / ".claude")


def redact(text: str) -> str:
    for pattern in SECRET_PATTERNS:
        text = pattern.sub("[hidden]", text)
    return NAMED_SECRET.sub(lambda m: f"{m.group(1)}{m.group(2)}[hidden]", text)


def excerpt(text: str, limit: int = EXCERPT) -> str:
    # Cut before masking would let a secret straddle the cut; mask first, then cut.
    text = redact(text.strip())
    return text if len(text) <= limit else text[: limit - 1].rstrip() + "…"


def transcript_path(home: Path, cwd: str, session_id: str) -> Path | None:
    # The id names a file: anything but a plain id could walk out of the folder.
    if not re.fullmatch(r"[A-Za-z0-9-]+", session_id or ""):
        return None
    return home / "projects" / re.sub(r"[^A-Za-z0-9]", "-", cwd) / f"{session_id}.jsonl"


def alive(pid: int) -> bool:
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    except PermissionError:
        return True
    return True


def ancestor_pids(start: int | None = None) -> set[int]:
    """This script's ancestors: the session that runs it is one of them."""
    pids: set[int] = set()
    pid = os.getppid() if start is None else start
    for _ in range(12):
        if pid <= 1:
            break
        pids.add(pid)
        try:
            stat = Path(f"/proc/{pid}/stat").read_text()
            pid = int(stat[stat.rindex(")") + 2 :].split()[1])
        except (OSError, ValueError, IndexError):
            break
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
        content = (entry.get("message") or {}).get("content")
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


def summarize(entry: dict, home: Path, now: float, with_branch: bool = True) -> dict:
    cwd = str(entry.get("cwd") or "")
    sid = str(entry.get("sessionId") or "")
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
    return [e for e in read_registry(home) if e["pid"] not in own and alive(e["pid"])]


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
    recent = turns(lines)[-max(1, min(count, 30)) :]
    rows = []
    for t in recent:
        row = {"role": t["role"], "text": excerpt(t["text"], 1500), "ts": t.get("ts")}
        if "options" in t:
            row["options"] = [excerpt(o, 80) for o in t["options"]]
        rows.append(row)
    return {"session": summarize(entry, home, now), "turns": rows}


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
