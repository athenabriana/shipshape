---
status: in-progress
created: 2026-10-28
slug: diagnose-skill
---

# The bug flow: `/ss:diagnose`

Today a bug in ss either goes through `/ss:shape` like a feature, or it has no skill at all. Most bugs need no spec: there is no business rule to align on, only a cause to find and a fix to prove. `/ss:diagnose` is that flow. From a short description ("diagnose and fix", "esse bug", a pasted error or stack trace) it investigates, finds the cause, reproduces the failure, fixes it with the smallest change, proves the fix, and delivers it through the destination logic of `/ss:ship`.

Success: a bug report becomes a branch with a fix and a focused test, where the test is shown to fail without the fix and pass with it, and the user answered at most one question to get there.

## Where it sits in the flow

`/ss:shape` → `/ss:build` → `/ss:ship` stays the path for features. `/ss:diagnose` is a side door into the same `/ss:ship`: it replaces shape and build for a bug, never ship. When the bug turns out to be a missing or contradictory business rule, it is no longer a bug, and the skill hands it to `/ss:shape`.

## Decisions

- The skill is `plugins/ss/skills/diagnose/`, invoked as `/ss:diagnose`.
- The run asks its scope once, at the start, with one `AskUserQuestion`: fix only, or fix and ship through `/ss:ship`. This is the up-front authorization that lets it chain into `/ss:ship` without asking again, the same way `/ss:build` does.
- When the request already states the scope ("and ship", "and babysit", "abre o PR"), that phrase is the answer: the skill skips the question and says which scope it read.
- Stopping early means stopping the investigation: once a reproduction confirms the cause and the fix is small and obvious, the skill states the cause and the fix in two lines and goes on to fix and prove. The proof is never skipped.
- The proof has two parts: the reproduction fails before the fix and passes after it, and a focused test fails without the fix and passes with it.
- When the project's checks cannot run locally (`runnable: false` from `resolve_checks.py`), the focused test is committed and pushed alone first, CI shows it red, and the fix follows in its own commit for CI to turn green.
- The fix is the smallest change that removes the cause. Refactors and neighboring cleanups found on the way are reported, never folded in.
- A bug that reveals an undefined or contradictory business rule stops the run and hands it to `/ss:shape` with what was found.
- Delivery belongs to `/ss:ship`: the skill invokes it at the fix-and-ship scope and never reimplements a destination. At the fix-only scope it commits and ends at a gate that offers `/ss:ship`.
- The proof rule for a bug fix is stated once in the plugin. Where the build/ship side already states it, the skill points at that text instead of copying it.

## Behavior

Happy path:

1. The user describes the bug. The skill reads the scope from the request or asks once.
2. It runs `preflight.py` and `resolve_checks.py` once and reads the branch, the PR and `runnable` from them. On a protected branch it creates a `fix/<slug>` branch.
3. It investigates: reads the error, the code paths it names, and recent history of those files, and forms a hypothesis for the cause.
4. It reproduces the failure with the smallest command or script that shows it.
5. It writes a focused test that fails because of the bug.
6. It applies the smallest fix, then shows the reproduction and the test passing.
7. It commits the test and the fix in conventional commits and reports cause, fix and proof.
8. At the fix-and-ship scope it invokes `/ss:ship`; at fix-only it ends at the gate offering `/ss:ship`.

| case                                                      | outcome                                                                              |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| WHEN the request states the scope                         | THEN no scope question; the skill names the scope it read                            |
| WHEN the cause is confirmed and the fix is one small edit | THEN the investigation stops there and the skill says so; the proof still runs       |
| WHEN the failure cannot be reproduced                     | THEN the skill stops, reports what it tried and its hypotheses, and fixes nothing    |
| WHEN the project has no test framework                    | THEN the reproduction is the proof, and the report says no focused test exists       |
| WHEN `runnable` is false and the destination is a PR      | THEN the test is pushed alone first, CI shows red, then the fix turns it green       |
| WHEN `runnable` is false and the destination is main      | THEN the report says the test-fails-first half of the proof was not shown            |
| WHEN the bug reveals an undefined business rule           | THEN the run stops and hands off to `/ss:shape` with the findings                    |
| WHEN the fix grows past a small change                    | THEN the skill stops and proposes `/ss:shape` instead of a large unspecced change    |
| WHEN the user is on `main` or another protected branch    | THEN the skill creates a `fix/<slug>` branch before the first edit                   |
| WHEN the CI after the fix stays red on the new test       | THEN the fix did not hold; the skill goes back to the investigation, at most 3 times |

## Attention points

- The proof rule may land in `/ss:build` or `/ss:ship` on another branch at the same time; pointing at a file that does not exist on `main` yet leaves a broken reference.
- The trigger phrases overlap with `/ss:ship`'s "green the PR" and with `/ss:review`; the `description` has to keep a red CI on a PR with `/ss:ship`.
- The test-first push relies on CI running on every push to the branch; a repo whose CI runs only on `pull_request` shows no red until the PR exists.

## Tasks

### The skill

- [x] **1. `diagnose/SKILL.md`**: frontmatter (`name`, `description` with exact trigger phrases, `license`, `metadata`) and the workflow above, reusing `preflight.py`, `resolve_checks.py` and `/ss:ship`. · verify: CI

### The docs

- [ ] **2. The skill lists**: `/ss:diagnose` in the `README.md` skill table and in the `.claude/CLAUDE.md` structure tree. · verify: reading

## Out of scope

- Writing to `.ss/wiki/` from a bug fix. _revisit_
- Running `/ss:review` inside the bug flow; the user can run it before ship.
- Triaging many bugs at once or reading an issue tracker.

## Open

Nothing.
