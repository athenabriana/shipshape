# Reading Claude Code / Claude Desktop sessions from disk

Use when the person wants to see, summarize or continue work from a Claude Code or Claude Desktop (Code tab) session, or when a front Bot's brief is built from them. The sessions are plain files, so you can read them directly. Never answer "I can't read those sessions" or ask for screenshots before checking these paths.

## Where they live (Linux)

| What                                                 | Path                                                                      |
| ---------------------------------------------------- | ------------------------------------------------------------------------- |
| Full transcripts (CLI and Desktop)                   | `~/.claude/projects/<cwd with / replaced by ->/<cliSessionId>.jsonl`      |
| Subagent / workflow transcripts                      | `~/.claude/projects/<proj>/<cliSessionId>/subagents/**/agent-*.jsonl`     |
| Desktop session metadata (title, status, PRs, links) | `~/.config/Claude/claude-code-sessions/<org>/<account>/local_<uuid>.json` |
| Desktop side-session notes                           | `~/.config/Claude/side-session-notes/<parent local_ id>/`                 |

Worktree sessions have their own project dir: `...-<repo>--claude-worktrees-<name>`.

## Survey recent sessions ("what was I doing?")

When the person asks what they were working on, without naming a session, sort every top-level transcript by modification time and print a short card per session. Skip subagent files: they repeat their parent's work.

```python
import json, glob, os, time
fs = sorted(glob.glob(os.path.expanduser('~/.claude/projects/*/*.jsonl')), key=os.path.getmtime, reverse=True)
for f in fs[:6]:
    msgs, branch = [], None
    for l in open(f):
        try: d = json.loads(l)
        except ValueError: continue
        branch = d.get('gitBranch') or branch
        if d.get('type') in ('user', 'assistant'):
            c = d.get('message', {}).get('content')
            t = c if isinstance(c, str) else ' '.join(x.get('text', '') for x in (c or []) if isinstance(x, dict) and x.get('type') == 'text')
            t = t.strip()
            if t and not t.startswith('<'): msgs.append((d['type'], t))
    first = next((t for r, t in msgs if r == 'user'), '')
    print('==', os.path.basename(os.path.dirname(f)), time.strftime('%m-%d %H:%M', time.localtime(os.path.getmtime(f))), branch)
    print('FIRST:', first[:200]); [print(f'  [{r}]', t[:300].replace('\n', ' ')) for r, t in msgs[-3:]]
```

- The first user message is often an injected skill body (`Base directory for this skill: …`) or a scheduled run with no user text. Judge the topic from the last assistant messages instead.
- Report as a table (last active, what it was), then check the live state of anything that has a PR before calling it done (step 4 below).

## Procedure

1. **Find the session by title.** Desktop titles are not in the jsonl. Grep the metadata dir instead:
   `grep -rl -i "<title fragment>" ~/.config/Claude/claude-code-sessions`
2. **Read the metadata JSON first.** It is cheaper than the transcript, and these fields give the state:
   - `title`, `cwd`, `worktreePath`, `branch`, `sourceBranch`
   - `cliSessionId`: the jsonl filename under `~/.claude/projects/`
   - `lastTurnReport`, `postTurnSummary.status_detail`, `turnWrapUp`: what the last turn claimed
   - `prs[]`: PR number, url, branch, state
   - `spawnedFrom` / `startChain`: the orchestrator (parent) session. The parent's `pendingSystemReminder` holds the children's reports.
     Values can be big (MCP configs, tool snapshots), so print only these keys.
3. **Read the transcript tail.** Each jsonl line has `type` (`user`/`assistant`) and `message.content`, which is a string or a list of blocks. Print only `text` blocks, truncated:
   ```python
   import json
   for l in open(path):
       try:
           d = json.loads(l)
       except ValueError:
           continue
       if d.get('type') in ('user', 'assistant'):
           c = d.get('message', {}).get('content')
           t = c if isinstance(c, str) else ' '.join(x.get('text', '') for x in (c or []) if isinstance(x, dict) and x.get('type') == 'text')
           if t.strip():
               print(f"[{d['type']}] {t[:700]}\n")
   ```
4. **Check the live state before reporting.** `lastTurnReport` is a snapshot and goes stale: a CI run it calls "in progress" may have failed since. Run `gh pr view <n> --json statusCheckRollup`, `gh run list -b <branch>` and `gh run view <id> --log-failed`, and check `git status`/`git log -1` in the worktree. Report what is true now.
5. **Continuing the work:** you can't send messages into a Desktop session. Work in the same worktree and branch through a session the Bot starts (a background `--source cli` session), never from the Bot itself.

Transcripts can hold personal data and secrets pasted into a chat. Copy only what the brief needs, and never copy a token, password or key into a brief, a persona or memory.
