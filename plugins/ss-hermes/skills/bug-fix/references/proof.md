# The proof a fix owes

Read this when your task fixes a bug: a `bug-fix` run, or a card whose acceptance criteria
name a bug to reproduce. Your caller keeps its own steps (where the reproduction lives, how
the commits are named, who reads the result). This page says what makes the fix proven.

The sections below run in order: the two halves of the proof, the order they are built in,
what makes a test count, and how each half is shown.

## The two halves

A fix is proven when both halves hold, and the report shows both:

1. **The reproduction fails before the fix and passes after it.** It fails the way the
   report describes. A reproduction that passes before any fix shows nothing about the bug:
   stop there, since either the reproduction or the cause is wrong.
2. **The focused test fails without the fix and passes with it.** It is the half that stays
   in the repo, and "The focused test" below says what makes it count.

When the project has no test framework, the reproduction is the whole proof. The report says
that no focused test exists, and the choice of a framework stays with the person.

## The order

Build the proof in this order, because each step is evidence only when the one before it
was seen:

1. Reproduce the failure before you touch any code. A fix for a failure nobody saw is a
   guess.
2. Write the focused test, and only the test. When any half of the proof runs in CI, commit
   it alone, before the fix: that commit lets CI show the red half without rewriting
   history.
3. Build the fix, the smallest change that removes the cause.
4. Run the reproduction and the test again: both pass.

## The focused test

The focused test is a claim about behavior: what a user of the code observes through its
interface. It counts when all of these hold:

- **It goes through the real code path the fix changes.** A test that mocks the unit the fix
  changes proves nothing about the bug. Replace only what sits outside that path, such as a
  network service or the clock.
- **It asserts what a user of that code observes.** A return value, an error a caller
  branches on, state the caller can read back, or the effect on an outside system. Private
  helpers, the order of internal calls and intermediate data are the implementation, and a
  test pinned to them breaks on a refactor that keeps the behavior.
- **Its expected value comes from the report or the requirement.** A value computed by the
  code under test, or read back from data the test built itself, agrees with the bug.
- **It fails because of the bug.** The failure is the assertion on the behavior, not an
  import error, a missing fixture or a timeout.
- **It covers this bug and nothing around it.** Write it in the project's own test
  framework, next to the tests that already cover that code.

Check the test against two imagined edits before you trust it:

- **Break the behavior** (a wrong value, an effect skipped or doubled). The test fails. If
  it still passes, tighten the assertion.
- **Change the internals** and keep every observable result. The test passes. If it fails,
  it asserts the implementation: move the assertion to what a user observes.

## Show each half

Checks run in CI, not locally. The one local run allowed is the single focused reproduction
or test, and only when it is cheap: seconds, no build, no service to start.

- **Cheap to run locally:** run all three yourself. The reproduction fails before the fix,
  the test fails without the fix, and both pass with it. The proof is `local` only when you
  saw all three.
- **Not cheap:** run nothing locally. Read the code until you can point at where the failure
  comes from. CI shows the red half on the test commit alone and the green half on the
  head. Follow each run with `terminal(background=true, notify=true)` and
  `gh run watch RUN_ID --exit-status`. The proof is `pending` until both runs are read.

A red CI run is the red half only when the failure names the focused test. Red on another
check, or green, says nothing about the bug.

The report states each half with what showed it: the command and its output for a local run,
the run URL and the sha for CI.

## Edge cases

| when                                              | then                                                                  |
| ------------------------------------------------- | --------------------------------------------------------------------- |
| the reproduction passes before the fix            | stop and return it to your caller; nothing is fixed                   |
| the focused test passes without the fix           | rewrite it until it fails                                             |
| the test mocks the unit the fix changes           | it does not count: drive the real code path                           |
| the test fails without the fix for another reason | it does not count: make it fail on the assertion about the behavior   |
| the test is not cheap to run locally              | the test commit lands alone first; CI shows red, then green           |
| CI is red on the test commit on another check     | the red half is not shown; the report says so                         |
| the project has no test framework                 | the reproduction is the proof; the report says no focused test exists |
| the bug is that something got slow                | follow `performance.md` next to this file                             |
