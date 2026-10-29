---
status: in-progress
created: 2026-10-28
slug: bug-fix-proof
---

# Proof for a task that fixes a bug

A task that fixes a bug is proven today the way any task is: its `verify:` runs once, after
the change, and a green test at that point says nothing about the bug. The test may never
have failed, or it may mock the very code the fix changed. The proof a bug fix needs has an
order to it: the original failure shows first, the fix goes in, the same reproduction passes,
and a focused test stays behind that fails without the fix.

This spec gives that proof a place in the flow. A spec marks the task with `verify: repro:`,
the build builds it test first in two commits, and the ship refuses to open or finish the PR
until each such task carries its proof. Where the machine forbids local runs, the red half of
the proof comes from CI, on a push of the test commit alone. ss still never merges: the
proof is what a human reads before they do.

## The two places the proof comes from

- **Local**, when the checks may run here: the task agent runs the reproduction and sees it
  fail, writes the focused test and sees it fail, applies the fix, and sees both pass. That
  evidence travels in the fix commit, and the ship copies it into the PR.
- **CI in two steps**, when they may not (`resolve_checks.py` returns `runnable: false`): the
  task agent writes the same two commits without running anything and returns the proof
  `pending`. The ship pushes the branch up to the test commit, waits for CI to come back red
  on the focused test, then pushes the fix and follows CI to green. Both runs are named in
  the PR.

## Decisions

- A task that fixes a bug carries `verify: repro: <how the failure shows>`: a command, a test,
  or the steps that make the bug visible. It is the only marker; the task line keeps its
  three fields.
- A repro task lands as two commits, in this order: one with the focused test alone, then one
  with the fix and the task's tick. The test commit is what makes the red half provable
  without rewriting history.
- The focused test exercises the code path the fix changes. A test that mocks the unit the fix
  changed, or that passes on the code before the fix, does not count as the proof.
- A reproduction that does not fail before the fix means the spec's `repro:` is wrong: the task
  returns `underspecified` and the build hands back to `/ss:shape`.
- Local proof is enough when the run had it: the ship copies it into the PR and needs only CI
  green at the end.
- Pending proof is proven by CI in two steps, one red run per repro task: the branch is pushed
  up to each test commit in turn, its red run is waited for, then the push goes on.
- The red run counts only when what failed is that task's focused test. Red for another reason,
  or green, stops the ship.
- The ship requires the proof only for the repro tasks of the branch's spec. A branch with no
  spec, or a spec with no repro task, ships as it does today.
- When the fix already reached the remote before its red run exists, the ship stops with a
  blocker naming the task and the command to prove it by hand. It never force-pushes to get
  the test commit back on top.
- Pending proof on a protected-branch destination stops the ship the same way: the ship never
  pushes there, so it cannot take the two steps.

## Behavior

Happy path, local runs allowed:

1. The spec carries `- [x] **2. Empty cart total** ... · verify: repro: pnpm test cart -t total`.
2. The task agent runs the reproduction; it fails.
3. It writes the focused test, runs it, sees it fail, commits it alone.
4. It applies the fix; the reproduction and the test pass; it commits the fix with the tick and
   the evidence.
5. The ship finds the repro task in the branch's spec, finds the evidence in the fix commit,
   writes it into the PR's proof section, and opens the PR. CI goes green.

Happy path, local runs forbidden:

1. Same spec line. The task agent writes the test commit and the fix commit without running
   them and returns the proof `pending`; the build reports the task under `pendingVerify`.
2. The ship pushes the branch up to the test commit (opening the PR there on the PR path) and
   waits for CI.
3. CI comes back red, and the failure names the focused test.
4. The ship pushes the rest, follows CI to green, and writes both runs into the PR's proof
   section.

| WHEN                                                 | THEN                                                                 |
| ---------------------------------------------------- | -------------------------------------------------------------------- |
| the reproduction passes before the fix               | task returns `underspecified`; build stops and points to `/ss:shape` |
| the focused test passes before the fix (local)       | task returns red; the test does not catch the bug                    |
| the test mocks the code the fix changed              | task returns red; the proof does not count                           |
| a repro task returns green with no test commit       | the script reads it as red                                           |
| a repro task built in a phase with others            | both commits land on the run branch, test commit first               |
| local proof present for every repro task             | ship copies it into the PR; no extra CI run                          |
| proof pending, PR destination                        | PR opens at the test commit; red run, then the fix push              |
| proof pending, feature-branch destination            | same two pushes; the red run is the CI run on the test commit's sha  |
| proof pending, protected-branch destination          | ship stops with a blocker; it never pushes there                     |
| proof pending, no CI run appears for the test commit | ship stops with a blocker naming the sha                             |
| CI on the test commit is red on another check        | ship stops with a blocker; that red proves nothing about the bug     |
| CI on the test commit is green                       | ship stops with a blocker; the test does not catch the bug           |
| two repro tasks, proof pending                       | two red runs, each at its own test commit, then the final push       |
| the fix already on the remote, no red run recorded   | ship stops, names the task and the command to prove it by hand       |
| branch with no spec, or a spec with no repro task    | ship runs as today                                                   |
| build runs the tasks in this context (fallback)      | the same two commits and the same proof, in the same order           |

## Attention points

- The fix commit's evidence is written by the task agent in `build-tasks.js` and read by the
  ship in `ship/SKILL.md`: the two drift apart unless one form is stated in one place.
- A task built in a worktree returns one `commit` that the landing agent cherry-picks in
  `landPrompt`; a repro task has two, and the landing order between them matters.
- Many CI workflows run only on `pull_request`, so a push of the test commit to a branch with no
  PR may start no run at all.
- A workflow with `concurrency: cancel-in-progress` cancels the red run when the fix push lands
  before it finishes.
- `taskPrompt`'s string is the resume cache key, so whatever changes it for a repro task must
  leave the prompt of every other task byte for byte the same.
- The ship's PR body lives in `references/ship-pr.md`, which this change does not touch: the
  proof section reaches it from `ship/SKILL.md`.

## Tasks

### Foundation

- [x] **1. The repro marker**: `spec-format.md` gains `verify: repro:` and what the build and
      the ship do with it, including what does not count as the focused test. · verify: reading

### The task agent's contract

- [x] **2. Test first in the script**: `build-tasks.js` gives a repro task the ordered steps,
      the two commits, the evidence in the fix commit, `testCommit` in the result, the landing
      order, and `failureOf` reading a repro task without its proof as red. · verify: CI

### The two readers

- [x] **3. Build proves it**: `build/SKILL.md` step 8 and the in-context fallback say how a
      `repro:` task is proven, and that its pending proof rides to ship. · verify: reading
- [x] **4. Ship requires it**: `ship/SKILL.md` gains the proof step before the ship: local proof
      into the PR, pending proof through CI in two steps, and every stop above. · verify: reading

## Out of scope

- Proof for `fix` commits on a branch with no spec: judging what is a bug is review's work.
- `references/ship-pr.md`, `references/build-tasks-workflow.md` and the review skill: untouched.
- Merging: ss never merges, with or without the proof.
- A new skill for diagnosing bugs: another session's work (_revisit_ once diagnose-and-fix lands).

## Open

Nothing.
