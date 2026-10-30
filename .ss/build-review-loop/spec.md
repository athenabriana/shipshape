---
status: pending
created: 2026-10-29
slug: build-review-loop
---

# The build's review runs the review loop

`/ss:build` with review in its scope runs a single pass today (step 11): every front once,
`ss-review-verifier` judges, every CONFIRMED finding is applied and every PLAUSIBLE one is
reported. `/ss:review` on the branch runs a budgeted loop by default
(`plugins/ss/skills/review/references/loop.md`): an outside reviewer judges, the owner fixes
or refuses each verified finding with a ground, and later rounds re-read only what changed.
The two disagree on the same branch, and the build's pass is the weaker one, with no second
look at its own fixes. This change makes step 11 run the loop, so the PR opens from code the
loop already closed.

## The loop before a PR exists

The build's review runs before the ship, so there is no PR yet. `loop.md` stays the one
contract, and it gains a short section for this caller:

- **Round 1** runs every front the probe finds except `threads` and `ci`: both read a PR,
  and the ship is what handles them.
- **Rounds, budget, owner and reviewer** run as `loop.md` states: `loop_reviewer.py detect`
  resolves the reviewer once, 3 rounds or 5 for security, permissions or data loss.
- **After the last round** nothing is pushed, no thread is answered and no CI is read: the
  commits stay on the branch and the ship pushes them and follows CI.
- **No gate**: the scope answer at step 2 already authorized the review and the ship.

The tree is committed when step 11 starts (step 9 commits every task), so the loop's
"uncommitted changes" route to the manual flow does not fire here.

## Decisions

- Step 11 runs `loop.md` over the branch in place of the single pass. The CONFIRMED-applied,
  PLAUSIBLE-reported rule is gone: the owner decides every verified item, PLAUSIBLE included.
- Fixes go through steps 7 to 9 like any other change, one commit each, with the body line
  `Review round N.` that `loop.md` sets. No reviewer or model name appears outward.
- A loop that ends `open` (budget spent with a Bloqueante still open) still ships. The PR
  description carries a review section listing each open Bloqueante (number, `file:line`,
  claim) and each disputed refusal, and says the PR is not ready to merge until they are
  settled.
- A loop that ends `clean` or `disputed` ships the same way; a `disputed` one lists its
  disputed refusals in that section too. `clean` adds one line: `Review loop: N rounds, verdict clean.`
- The build report (step 14) carries the loop's `Loop` block and its refusals in place of
  the two sets of the single pass.
- `/ss:review deep` stays a separate invocation; the build's loop runs at standard depth.
- The `build/SKILL.md` description stays: it says build chains into `/ss:review`, which
  stays true. Versions: build takes a minor bump, review a patch bump for `loop.md`.

## Behavior

Happy path:

1. The last phase lands, the wiki pass runs, the tree is green and committed.
2. Step 11 resolves the loop's reviewer and says it in one line, with the fronts and depth.
3. Round 1: the fronts fan out, the reviewer judges, the owner fixes or refuses each item.
4. Rounds 2 and on re-read the delta until a round brings no Bloqueante or the budget ends.
5. The ship opens the PR from the branch with the loop's fixes on it, and the PR description
   carries the verdict line or the review section.
6. The build report shows the `Loop` block, the refusals and the PR.

| WHEN                                          | THEN                                                                   |
| --------------------------------------------- | ---------------------------------------------------------------------- |
| round 1 has no verified finding               | loop ends `clean`, nothing committed, the ship runs                    |
| budget spent with a Bloqueante open           | the ship runs; the PR description lists the open ones, not ready       |
| a refusal stays contested                     | verdict `disputed`; the PR description lists it; the ship runs         |
| no outside reviewer installed                 | `ss-review-verifier` judges every round, said in one line              |
| the outside reviewer fails in a round         | that round falls back to `ss-review-verifier`; its row says so         |
| a loop fix turns a check red                  | fixed through steps 7 to 9 before the next round or the ship           |
| a finding asks for work outside the branch    | refused as out of scope, listed with the refusals                      |
| the scope has review and no ship              | the loop runs the same; step 14 offers the ship with the verdict shown |
| the build stopped before step 11              | no loop runs, as today                                                 |
| no Agent tool in the session                  | the loop runs in the main context with a self-check, said in the report |
| a PR already exists for the branch (a re-run) | `threads` and `ci` still stay out; the ship handles them               |

## Attention points

- `loop.md` "After the last round" pushes when an open PR exists; a build re-run on a branch
  with a PR would push mid-build unless the build caller's section overrides it.
- The ship drafts the PR body from commits and spec (`ship/references/ship-pr.md` step 3);
  the review section has to reach that draft from build's context, and ship's files are not
  edited here.
- `review/SKILL.md` step 1 routes the loop by mode; the build caller enters it from outside
  that routing, so the probe and the intent read still have to run first.

## Tasks

### The loop's build caller

- [ ] **1. loop.md knows the build caller**: a short section in
      `plugins/ss/skills/review/references/loop.md` for a run that `/ss:build` starts: no
      `threads`/`ci`, no push, no thread replies, no CI read, no gate; review version patch
      bump. · verify: reading

### Build runs it

- [ ] **2. Build step 11 runs the loop**: `plugins/ss/skills/build/SKILL.md` step 11
      rewritten to run `loop.md` through its build caller section; steps 12 and 14 carry the
      verdict into the PR description and the `Loop` block into the report; the edge table
      rows on the review updated; build version minor bump. · verify: reading

## Out of scope

- The orchestrator's merge rule for a PR with open Bloqueantes: `/ss:orchestrate` reads the
  PR description; that skill is another front's.
- A draft-PR switch in `/ss:ship`.
- Running the build's loop at deep depth.

## Open

Nothing.
