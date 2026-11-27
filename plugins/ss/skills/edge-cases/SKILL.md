---
name: edge-cases
description: Maps the edge cases of a behavior, in two modes picked from the request. Plan mode, before coding, turns a planned behavior, a brief or a feature description into WHEN/THEN acceptance criteria with the expected outcome of each, written where the caller says, and asks the person every outcome nobody decided. Diff mode hunts the edge cases a branch, a diff, a PR or a function does not handle, with parallel scouts per category, proves each one with file and line evidence or one cheap throwaway check, and reports only what holds, then offers focused tests or a hand-off to the bug-fix playbook of /ss:go. Use when the person says "edge cases", "what could break", "corner cases", "what am I missing", "test the edges", "casos de borda", "o que pode quebrar", or when /ss:go or /ss:review deep call it as a step. Not for fixing a known bug (use /ss:go) or a full review of a diff (use /ss:review).
license: MIT
metadata:
  author: Athena Briana - github.com/athenabriana
  version: 1.1.1
---

# Edge cases

Find the cases a behavior must survive beyond its happy path. Plan mode maps them before the
code exists. Diff mode hunts the ones a change already misses. Both end in a table.

Code changes only on the person's choice at the close.

## Pick the mode

- **Plan mode:** the input is a planned behavior, a session brief, a feature description or
  acceptance criteria, with no code for the behavior yet.
- **Diff mode:** the input is a branch, a diff, a PR number or a named function.

When both fit (a brief with a half-built branch), ask once with `AskUserQuestion`, diff mode
first.

**As a playbook step.** When `/ss:go` or `/ss:review deep` runs this skill, skip the closing
question and return the table to the caller.

## The categories

Walk each one. Keep only those the behavior can reach, and say in one line which you dropped.

| category                | look for                                                             |
| ----------------------- | -------------------------------------------------------------------- |
| cardinality             | empty, zero, one, many                                               |
| boundaries              | min and max, off-by-one, inclusive vs exclusive, negative            |
| bad input               | null, missing field, wrong type, malformed, whitespace only          |
| duplicates and ordering | the same item twice, unsorted input, stable order expected           |
| concurrency             | two writers, retries, double submit, idempotency, lost update        |
| time                    | timezones, DST, clock skew, expiry, leap days, end of month          |
| i18n                    | unicode, emoji, RTL, combining marks, locale formats, case folding   |
| auth and tenancy        | no permission, expired session, another tenant's id, role change     |
| partial failure         | timeout, network drop, half-written state, dependency down, rollback |
| scale                   | large input, size limits, pagination edges, rate limits              |
| state transitions       | invalid transition, re-entry, cancel mid-flow, repeat after success  |
| compatibility           | old data, missing migration, old client, renamed or removed field    |

## Plan mode

1. **Read the ground.** Read the brief or description, then the code it will touch and the
   repo's `CLAUDE.md` (or `AGENTS.md`), including its `## Project facts`. Note what the code
   already does at each edge: a constraint the database enforces is an outcome you do not
   have to invent.
2. **Walk the categories.** For each that applies, write rows of the form
   `WHEN <case> THEN <observable outcome>`. One case per row, phrased so it reads as a test.
   Map the outcome, not only that the case exists.
3. **Mark the load-bearing rows.** A row is load-bearing when the wrong outcome would betray
   the reason the behavior exists. Put those first. The load-bearing rows feed the goals of
   the goal loop (`<plugin-root>/references/goal-loop.md`): a caller that runs it (a `/ss:go`
   route, a brief) takes each as a goal, and each row names its check, the test or command
   that would confirm it.
4. **Ask what nobody decided.** A row with no known outcome is a product question for the
   person. Hand the open rows to `/ss:clarify`, each naming the case, what each outcome
   does and the recommended one first; clarify asks them in the form it picks (the question
   tool for one, a decision sheet for more) and returns the answers. When `/ss:clarify`
   called this skill, the rows go back to it with the table instead. The row stays marked
   `open` until it is settled.
5. **Write the table where the caller says.** That is a path the caller gives (a session
   brief, a front doc, a PR body), or the chat when nobody gives one. Use this shape, ready to
   paste as acceptance criteria:

   ```
   | # | category | WHEN | THEN | check | load-bearing |
   ```

   Then list the `open` rows with the question each one is waiting on. Before a question
   asks the person to settle or approve rows, show the table as a visual, by
   `<plugin-root>/references/show-for-review.md`: an inline visual, an Artifact page when
   the table is too big, or the doc the caller's path names, opened for them. When a row taught
   something about the project the code does not show (a constraint, a trap), offer
   `/ss:record-fact` for it, and record it only on a yes.

## Diff mode

### 1. Resolve the scope

Resolve the range once: `git merge-base HEAD origin/BASE` for a branch;
`gh pr diff N` and `gh pr view N --json baseRefName,headRefOid` for a PR; the function's file
and its callers for a function. Read the diff with each touched function open, then list its
callers (`git grep`). The callers decide which inputs can arrive.

### 2. Send the scouts

Split the categories that apply into 3 or 4 slices and send them as `Agent` subagents in
**one message**, one subagent per slice, each with `model: sonnet`. A subagent sees nothing
of this chat, so each prompt holds:

- the repo path, the branch and the resolved range (`<merge_base>...HEAD`, never a
  placeholder), the changed files and one paragraph of what the change does;
- its category slice, with the "look for" column above;
- the rules: read only, edit nothing, run no test suite, lint or build; every candidate
  carries `file:line`, a concrete input that reaches it, and what the code does with that
  input; at most 8 candidates; return questions instead of guessing.

Point them at `<plugin-root>/skills/review/references/front-correctness.md` for the hunting
angles. On a diff of about 2 files and 100 lines or less, skip the subagents and walk the
categories yourself.

### 3. Prove each candidate

A candidate is a claim until it is proven. For each one, pick the cheaper proof:

- **Trace:** follow the input from the caller to the line, with `file:line` at each hop,
  until the wrong outcome is visible in code.
- **One throwaway check:** a tiny script in the session's scratchpad, or one focused test,
  only when it runs in seconds with no build and no service. Show the command and what it
  printed.

What neither proves is dropped, or kept as `unconfirmed` with the missing step named. Merge
candidates that hit the same line for the same reason.

### 4. Report

```
| # | case | file:line | input | what happens now (evidence) | expected | level |
```

`file:line` is where the wrong outcome happens, so `/ss:review deep` can pool the row as a
candidate. `level` is **Bloqueante** or **Sugestão**, as
`<plugin-root>/references/finding-levels.md` defines them: Bloqueante when the change ships a
broken outcome for a reachable input, Sugestão for everything else worth saying. Bloqueantes
first. Below the table: the `unconfirmed` rows, the categories dropped and why, and one stats
line (scouts, candidates, proven, unconfirmed, dropped). An expected outcome nobody decided
goes through step 4 of plan mode, never a guess.

### 5. Close

Skip this when running as a playbook step. Otherwise show the table first, as plan mode
does by `<plugin-root>/references/show-for-review.md`, then one `AskUserQuestion`, recommended
first:

1. **Add focused tests for the confirmed cases (Recommended):** one test per case, committed
   after the preservation check, pushed, and followed in CI with `Bash` in the background
   (`run_in_background`) running `gh run watch RUN_ID --exit-status`. A push needs this yes;
   name the branch.
2. **Hand the fixes to the bug-fix playbook:** one `/ss:go` run per confirmed Bloqueante, with
   its row as the report.
3. **Stop here:** the table stays in the chat.

## Edge cases

| when                                        | then                                                     |
| ------------------------------------------- | -------------------------------------------------------- |
| no category applies                         | say why in one line per category, return an empty table  |
| a scout fails or returns nothing            | walk its slice yourself; the stats line says so          |
| a proof needs a build, a suite or a service | do not run it; trace, or mark the row `unconfirmed`      |
| the diff is empty                           | say there is nothing to check and stop                   |
| a candidate is a bug the diff did not touch | report it as Sugestão, flagged pre-existing              |
| the caller gives no path in plan mode       | the table goes in the chat                               |
| running in a work session                   | questions go to the orchestrator, per the front contract |
