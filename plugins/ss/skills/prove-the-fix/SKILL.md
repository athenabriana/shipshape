---
name: prove-the-fix
description: Situational skill for an agent whose task fixes a bug, loaded by the path its row in the plugin's references/triggers.md gives. States the proof a bug fix owes. The reproduction fails before the fix and passes after it, and the focused test goes through the real code path the fix changes, asserts what a user of that code observes, fails without the fix and passes with it. Read by /ss:diagnose and by the task agents of /ss:build repro tasks. It is not a command.
user-invocable: false
license: MIT
metadata:
  author: Athena Briana - github.com/athenabriana
  version: 1.0.0
  kind: situational
---

# Prove the fix

Your task fixes a bug: a `/ss:diagnose` run, or a `/ss:build` task whose `verify:` is `repro:`. This page is the proof that fix owes, and it holds wherever the fix is built. Your caller keeps its own steps (where the reproduction lives, how the commits are named, who reads the result); this page says what makes the fix proven.

The trailers that carry the proof to `/ss:ship` are written in one place, `PROOF_TRAILERS` in `<plugin-root>/workflows/build-tasks.js`, and a build task's prompt hands them to you. Take their form from there.

The sections below run in order: the two halves of the proof, the order they are built in, what makes a test count, and how each half is shown.

## The two halves

A fix is proven when both halves hold, and the report shows both:

1. **The reproduction fails before the fix and passes after it.** It fails the way the report or the task describes. A reproduction that passes before any fix shows nothing about the bug: stop there and return it to your caller, since either the reproduction or the cause is wrong. In a build that is `underspecified`; in `/ss:diagnose` it is the failure that cannot be reproduced.
2. **The focused test fails without the fix and passes with it.** It is the half that stays in the repo, and the next section says what makes it count.

When the project has no test framework, the reproduction is the whole proof. The report says that no focused test exists, and the choice of a framework stays with the person.

## The order

Build the proof in this order, because each step is evidence only when the one before it was seen:

1. Reproduce the failure before you touch any code. A fix for a failure nobody saw is a guess.
2. Write the focused test, and only the test. When any half of the proof runs in CI, commit it alone, before the fix: that commit is what lets CI show the red half without rewriting history.
3. Build the fix, the smallest change that removes the cause.
4. Run the reproduction and the test again: both pass.

## The focused test

The focused test is a claim about behavior: what a user of the code observes through its interface. It counts when all of these hold:

- **It goes through the real code path the fix changes.** A test that mocks the unit the fix changes proves nothing about the bug. Replace only what sits outside that path, such as a network service or the clock.
- **It asserts what a user of that code observes.** A return value, an error a caller branches on, state the caller can read back, or the effect on an outside system. Private helpers, the order of internal calls and intermediate data are the implementation, and a test pinned to them breaks on a refactor that keeps the behavior.
- **Its expected value comes from the report or the requirement.** A value computed by the code under test, or read back from data the test built itself, agrees with the bug.
- **It fails because of the bug.** The failure is the assertion on the behavior, not an import error, a missing fixture or a timeout.
- **It covers this bug and nothing around it.** Write it in the project's own test framework, next to the tests that already cover that code.

Check the test against two imagined edits before you trust it:

- **Break the behavior** (a wrong value, an effect skipped or doubled). The test fails. If it still passes, tighten the assertion.
- **Change the internals** and keep every observable result. The test passes. If it fails, it asserts the implementation: move the assertion to what a user observes.

## Show each half

How each half is shown depends on `runnable`, from `<plugin-root>/scripts/resolve_checks.py`:

- **`runnable` is true**: run all three yourself. The reproduction fails before the fix, the test fails without the fix, and both pass with it. The proof is `local` only when you saw all three.
- **`runnable` is false**: local runs are forbidden, so run nothing. Read the code until you can point at where the failure comes from. CI shows the red half on the test commit alone and the green half on the head, and the proof is `pending` until it does.

A red CI run is the red half only when the failure names the focused test. Red on another check, or green, says nothing about the bug.

The report states each half with what showed it: the command and its output for a local run, the run's URL and sha for CI.

## A performance bug

When the bug is that something got slow, the reproduction is a benchmark. Load `explain-the-number` by its row in `<plugin-root>/references/triggers.md` and run its protocol on the benchmark, before the fix and after it. The fix is proven only on a `faster` verdict:

- **`slower`**: the fix is wrong. Go back to the cause.
- **`inconclusive` or `no measurable difference`**: the fix is not proven. Report that verdict with the runs, and never call the bug fixed.

## Edge cases

| WHEN                                                 | THEN                                                                  |
| ---------------------------------------------------- | --------------------------------------------------------------------- |
| the reproduction passes before the fix               | stop and return it to your caller; nothing is fixed                   |
| the focused test passes without the fix              | it does not catch the bug: rewrite it until it fails                  |
| the test mocks the unit the fix changes              | it does not count: drive the real code path                           |
| the test fails without the fix for another reason    | it does not count: make it fail on the assertion about the behavior   |
| `runnable` is false                                  | the test commit lands alone first; CI shows red, then green           |
| CI is red on the test commit on another check        | the red half is not shown; the report says so                         |
| the project has no test framework                    | the reproduction is the proof; the report says no focused test exists |
| a performance fix ends `slower`                      | the fix is wrong; go back to the cause                                |
| it ends `inconclusive` or `no measurable difference` | report the verdict with the runs; the bug is not called fixed         |
