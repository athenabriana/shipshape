---
name: investigate
description: Answers a read only question about code, a branch or its history with evidence, and never edits. Covers how a subsystem works, why something was built this way, a summary of every change on the current branch against main, and a catch-up on in-flight work from earlier Claude Code sessions. Use when the user says "how does X work", "why does Y do this", "why is Y like this", "where is X", "compare with main", "branch context", "what changed on this branch", "summarize my branch", "diff against main", "what did I do on this branch", "what was I doing", "catch me up", or "are we sure that". Don't use it to judge a diff for bugs or quality (use /ss:review), to fix a bug (use /ss:go), or to open or land a branch (use /ss:ship).
license: MIT
metadata:
  author: Athena Briana - github.com/athenabriana
  version: 1.0.0
---

# Investigate

Answer a question about the code, a branch or its history, with evidence. This skill only
reads: it never edits a file, commits or pushes.

Every claim in the answer points at its evidence: a `path:line`, a commit, a PR, a
transcript line. Say plainly what you could not confirm.

## Pick the question type

| question                      | do this                                                               |
| ----------------------------- | --------------------------------------------------------------------- |
| how does X work, where is X   | trace from the entry point to the effect, then answer                 |
| why is Y like this            | `git log -L` or `git blame` on the lines, then the PR, then the issue |
| what changed on this branch   | the branch summary below                                              |
| what was I doing, catch me up | the session catch-up below                                            |

For a wide question, split it across up to 3 `Agent` subagents in one message, one slice
each (for example: callers, data shape, history). A subagent sees nothing of this chat, so
its prompt carries the question, the repo path, its slice, and the rules: read only, edit
nothing, run no test suite or build, and every claim needs a `path:line`. Merge their answers
yourself and drop any claim that has no evidence.

## Branch summary

Run the shared script once:

```
python3 <plugin-root>/scripts/gather_context.py
```

Optional flags: `--base BRANCH` compares against a given branch (the default is the repo's
default branch), and `--repo PATH` targets another repo.

It returns JSON with `branch`, `base_branch`, `merge_base`, `commit_log`, `commit_count`,
`diff_stat`, `files_changed`, `full_diff` and `uncommitted_changes`, plus `upstream` and
`pr_template` when available. When it returns an `error` field, report it and stop.

Report in this order:

1. **Branch:** the name and how far ahead of the base it is
   (`feature/my-feature, 12 commits ahead of main`).
2. **Purpose:** one sentence, taken from the commits and the diff.
3. **Commits:** grouped by theme, not listed one by one.
4. **Files:** grouped by change type and by area, with what changed in each, then the stat
   line (files changed, insertions, deletions).
5. **Open threads:** uncommitted changes, flagged as a warning; whether the branch is pushed;
   an open PR and its CI (`gh pr view --json number,state,statusCheckRollup`).
6. **Worth a look:** what reads as risky, incomplete or inconsistent in the full diff: an added
   `TODO` or `FIXME`, a debug print left in, a large or binary file, new code with no test, a
   change to a public API. Only what the diff shows.

## Session catch-up

- **Claude Code transcripts** live at `~/.claude/projects/<cwd with / as ->/<id>.jsonl`.
  List the most recent with
  `find ~/.claude/projects -name '*.jsonl' -printf '%T@ %p\n' | sort -rn | head`. Read only
  the `text` blocks of `user` and `assistant` lines, from the tail.
- **The desktop app's session tools**, when this session has them: list the recent sessions
  and search their transcripts for the topic, then read the tail of each match.
- **Check what is live before you report.** A transcript is a snapshot: read the PR state, CI
  and `git status` again now.

Answer as a short table, one row per thread: last active, what it was, state now, and what is
waiting on the person.

## Close

When `/ss:go` runs this skill as a playbook step, return the answer to it and stop.

Otherwise end with one handoff gate (`<plugin-root>/references/handoff-gate.md`) that offers
the natural next step: fix it (`/ss:go`), review it (`/ss:review`), ship it (`/ss:ship`), or
stop here. Never start the next step yourself. In a work session, the gate goes to the orchestrator
as `<plugin-root>/references/front-contract.md` says.
