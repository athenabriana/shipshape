---
name: edge-cases
description: Maps the edge cases of a behavior, in two modes picked from the request. Plan mode, before coding, turns a planned behavior, a card or acceptance criteria into WHEN/THEN rows with the expected outcome of each, ready for a Kanban card or a PR body, and asks the person every outcome nobody decided. Diff mode hunts the edge cases a branch, a diff, a PR or a function does not handle, with parallel scouts per category, proves each one with file and line evidence or one cheap throwaway check, and reports only what holds, then offers focused tests or a hand-off to ss:bug-fix. Use when the person says "edge cases", "what could break", "corner cases", "what am I missing", "test the edges", "casos de borda", "o que pode quebrar", or when ss:mode, ss:bug-fix or ss:review deep call it as a step. Not for fixing a known bug (use ss:bug-fix) or a full review of a diff (use ss:review).
license: MIT
metadata:
  author: Athena Briana - github.com/athenabriana
  version: 0.1.0
---

# Edge cases

Find the cases a behavior must survive beyond its happy path. Plan mode maps them before
the code exists. Diff mode hunts the ones a change already misses. Both end in a table.

Never edit code without the person's choice at the close. Never merge, approve or force-push.
Run no test suite, lint, type check or build locally: checks run in CI.

## Pick the mode

- **Plan mode:** the input is a planned behavior, a Kanban card, a feature description or
  acceptance criteria. No code to read for the behavior yet.
- **Diff mode:** the input is a branch, a diff, a PR number or a named function.

When both fit (a card with a half-built branch), ask once with `clarify`, diff mode first.

**As a playbook step.** When `ss:mode`, `ss:bug-fix` or `ss:review deep` calls this skill,
skip the closing question and return the table to the caller.

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

1. **Read the ground.** Read the card or description, then the code it will touch and the
   repo's `AGENTS.md`. Note what the code already does at each edge: a constraint the
   database enforces is an outcome you do not have to invent.
2. **Walk the categories.** For each that applies, write rows of the form
   `WHEN <case> THEN <observable outcome>`. One case per row, phrased so it reads as a test.
   Map the outcome, not only that the case exists.
3. **Mark the load-bearing rows.** A row is load-bearing when the wrong outcome would betray
   the reason the behavior exists. Put those first.
4. **Ask what nobody decided.** A row with no known outcome is a product question:
   - Only Athena decides (her repo, her setup, her taste): ask with `clarify`, at most 4
     questions per call, the recommended outcome first, each question naming the case and
     what each choice does. On a timeout, ask again at once.
   - The team decides (a rule users see): load `skill_view('abrir-discussao')` and open the
     discussion in `#bot-product-discussion` with the case and the options. The row stays
     marked `open` until it is settled.
5. **Return the table.** Markdown, ready to paste into a Kanban card body or a PR body as
   acceptance criteria:

   ```
   | # | category | WHEN | THEN | load-bearing |
   ```

   Then list the `open` rows with where each question went. When a row taught something
   about the project the code does not show (a constraint, a trap), offer to add it to
   `AGENTS.md` with `clarify`, and write it only on a yes.

## Diff mode

### 1. Resolve the scope

Resolve the range once: `git merge-base HEAD origin/<base>` for a branch,
`gh pr diff <n>` and `gh pr view <n> --json baseRefName,headRefOid` for a PR, the function's
file and its callers for a function. Read the diff with each touched function open, then
list its callers (`search_files`, `git grep`). The callers decide which inputs can arrive.

### 2. Send the scouts

Split the categories that apply into 3 or 4 slices and send them in **one `delegate_task`
call**, one task per slice, each with `"option": "sonnet"`. Children have no memory and see
nothing of this chat, so each task's `context` holds:

- the repo path, the branch and the resolved range (`<merge_base>...HEAD`, never a
  placeholder), the changed files and one paragraph of what the change does;
- its category slice, with the "look for" column above;
- the rules: read only, edit nothing, run no test suite, lint or build; every candidate
  carries `file:line`, a concrete input that reaches it, and what the code does with that
  input; at most 8 candidates; return questions instead of guessing.

Point them at `<plugin-root>/roles/finder.md` for the reading contract and at
`<plugin-root>/skills/review/references/front-correctness.md` for the hunting angles.
On a diff of about 2 files and 100 lines or less, skip the children and walk the categories
inline.

### 3. Prove each candidate

A candidate is a claim until it is proven. For each one, pick the cheaper proof:

- **Trace:** follow the input from the caller to the line, with `file:line` at each hop,
  until the wrong outcome is visible in code.
- **One throwaway check:** a tiny script in `$TMPDIR`, or one focused test, only when it
  runs in seconds with no build and no service. Show the command and what it printed.

What neither proves is dropped, or kept as `unconfirmed` with the missing step named. Merge
candidates that hit the same line for the same reason.

### 4. Report

```
| # | case | input | what happens now (evidence) | expected | level |
```

`level` is **Bloqueante** or **Sugestão**, as `<plugin-root>/references/finding-levels.md`
defines them: Bloqueante when the change ships a broken outcome for a reachable input,
Sugestão for everything else worth saying. Bloqueantes first. Below the table: the
`unconfirmed` rows, the categories dropped and why, and one stats line (scouts, candidates,
proven, unconfirmed, dropped). An expected outcome nobody decided goes through step 4 of
plan mode, never a guess.

### 5. Close

Skip this when running as a playbook step. Otherwise one `clarify`, recommended first:

1. **Add focused tests for the confirmed cases (Recommended):** one test per case, committed
   after the preservation check, pushed, and followed in CI with
   `terminal(background=true, notify=true)` and `gh run watch <id> --exit-status`. A push
   needs this yes; name the branch.
2. **Hand the fixes to `ss:bug-fix`:** one run per confirmed Bloqueante, with its row as
   the report.
3. **Stop here:** the table stays in the chat.

## Edge cases

| when                                        | then                                                     |
| ------------------------------------------- | -------------------------------------------------------- |
| no category applies                         | say why in one line per category, return an empty table  |
| a scout fails or returns nothing            | its slice is walked inline; the stats line says so       |
| delegation has no `sonnet` route            | scouts run without `option`; say so; suggest `/ss:setup` |
| a proof needs a build, a suite or a service | do not run it; trace, or mark the row `unconfirmed`      |
| the diff is empty                           | say there is nothing to check and stop                   |
| a `clarify` call times out                  | ask again at once; never decide on the person's behalf   |
| a candidate is a bug the diff did not touch | report it as Sugestão, flagged pre-existing              |
| running as a Kanban card worker             | questions go to the coordinator through `kanban_block`   |
