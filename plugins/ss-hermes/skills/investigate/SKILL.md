---
name: investigate
description: Answers a read-only question about code, a branch or its history with evidence, and never edits. Covers how a subsystem works, why something was built this way, what changed on the current branch against main, and a catch-up on in-flight work from earlier Hermes or Claude Code sessions. Use when the user says "how does X work", "why is Y like this", "what changed on this branch", "compare with main", "summarize my branch", "what was I doing", "catch me up", or "are we sure that". Don't use it to judge a diff for bugs (use ss:review), fix something (use ss:bug-fix) or land a branch (use ss:ship).
license: MIT
metadata:
  author: Athena Briana - github.com/athenabriana
  version: 0.3.0
---

# Investigate

Read-only. Every claim in the answer points at its evidence: a `path:line`, a commit, a PR,
a transcript line. Say plainly what you could not confirm.

## Pick the question type

| Question                       | Do this                                                               |
| ------------------------------ | --------------------------------------------------------------------- |
| How does X work                | trace from the entry point to the effect, then answer                 |
| Why is Y like this             | `git log -L` or `git blame` on the lines, then the PR, then the issue |
| What changed on this branch    | the branch summary below                                              |
| What was I doing / catch me up | the session catch-up below                                            |

For a wide question, split it across up to 3 `delegate_task` children, one slice each (for
example: callers, data shape, history). Give each child the question, its slice, and the rule
that every claim needs a `path:line`. Merge their answers yourself and drop any claim that has
no evidence.

## Branch summary

```
python3 <plugin-root>/scripts/gather_context.py
```

If the script is missing, use `git merge-base HEAD origin/main`, then `git log --oneline`
and `git diff --stat` against it. Report:

1. **Purpose:** one sentence, taken from the commits and the diff.
2. **Commits:** grouped by theme, not listed one by one.
3. **Files:** grouped by area, with what changed in each.
4. **Open threads:** uncommitted changes, a pushed or unpushed state, an open PR and its CI
   (`gh pr view --json number,state,statusCheckRollup`).

## Session catch-up

- **Earlier Hermes sessions:** `session_search` (search, then read the tail).
- **Claude Code:** transcripts at `~/.claude/projects/<cwd with / as ->/<id>.jsonl`. List the
  most recent with `find ~/.claude/projects -name '*.jsonl' -printf '%T@ %p\n' | sort -rn | head`.
  Read only the `text` blocks of `user` and `assistant` lines, from the tail.
- **Check what is live before reporting.** What a transcript says is a snapshot: re-read PR
  state, CI and `git status` now.

Answer as a short table, one row per thread: last active, what it was, state now, and what is
waiting on the person.

## Close

End with the natural next step as a `clarify` choice (fix it, review it, ship it, or stop
here). Never start it on your own.
