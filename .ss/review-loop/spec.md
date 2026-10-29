---
status: pending
created: 2026-10-28
slug: review-loop
---

# Review in a budgeted loop

`/ss:review` over the branch becomes a loop by default. The agent that owns the code fixes
each verified finding or refuses it with a stated ground, and a reviewer re-reads only what
changed and what is still open, round after round, until a round brings no Bloqueante or the
budget runs out. Different models find different problems, so the loop's reviewer is another
model or harness when one is installed (Codex CLI today), and the current `ss-review-verifier`
when none is.

Success: a branch review ends with the Bloqueantes fixed or refused on a ground, a record of
the rounds the user can read, and nothing outward that names a model.

## The rounds

- **Round 1, complete.** Every available front runs at standard depth (deep when asked),
  `threads` and `ci` included when the probe finds them. The step 2 question is skipped. The
  candidates are judged by the loop's reviewer, which takes the verifier's seat.
- **Rounds 2 and on, the delta.** The reviewer reads the code changed since the previous
  round, the findings still open and every refusal with its ground. It returns, per open
  finding, closed or still open; per refusal, accepted or contested; and new findings found
  only in the changed code.
- **One reviewer at a time**, the same one for every round of a run.

## Decisions

- The loop is the default for a review of the current branch. `/ss:review manual` (or "manual
  review", "let me pick") runs today's flow with the step 2 question and item by item
  curation. An external PR, a surface audit and a direct front ask keep today's flow.
- In the loop the step 2 question is not asked: every available front runs. The `deep`
  argument and phrase still set the depth.
- The owner (the main context) decides every finding alone: fix it under the guard of
  `act-apply-fixes.md`, or refuse it with a ground. No curation question inside the loop.
- A finding that asks for work outside the branch's change or its intent is refused as out
  of scope, and the refusal is reported.
- Budget: 3 rounds. It rises to 5 when a Bloqueante found in round 1 concerns security,
  permissions or data loss.
- Stop: the round returns no Bloqueante (only Sugestões: nits, comments, docs). The owner
  handles those Sugestões and no further round runs. Also stop when the budget is spent.
- A contested refusal the owner keeps is reported as disputed. It opens no extra round.
- The loop's reviewer is an installed outside reviewer (Codex CLI, found on `PATH`), run read
  only. With none installed, or when it fails in a round, that round uses
  `ss-review-verifier`, and the report says so.
- `threads` and `ci` enter round 1 only. Thread replies and resolves go out after the final
  push, carrying the fix sha. CI is read once after that push; still red goes to the report.
- One commit per fix, conventional style. Push once at the end of the loop when a PR is open;
  without a PR the commits stay local and the gate offers `/ss:ship`.
- The record: the session report carries the whole loop (each round, the reviewer by name,
  the findings in, fixed, refused, the verdict). Outward, commit bodies and PR text carry
  only the round number and the verdict, never a reviewer, model or harness name. The loop
  posts nothing on its own besides thread replies; commenting the open items is the gate's
  existing step 7 option.
- With uncommitted changes in the tree, the loop does not start: the review runs the manual
  flow and says why, so a fix commit never sweeps in the user's own work.

## Behavior

Happy path: `/ss:review` → probe → round 1 fan-out → the loop's reviewer judges the candidates
→ the owner fixes or refuses each → round 2 over the delta → a round with no Bloqueante →
the last Sugestões handled → push (PR open) → thread replies → CI read once → report with the
loop record → gate.

| WHEN                                                   | THEN                                                         |
| ------------------------------------------------------ | ------------------------------------------------------------ |
| Codex CLI is not on `PATH`                             | the reviewer is `ss-review-verifier`; the report says so     |
| the outside reviewer fails in a round                  | that round falls back to `ss-review-verifier`, said in a line |
| round 1 has no verified finding                        | the loop ends, verdict clean, nothing committed              |
| a round returns only Sugestões                         | the owner handles them and the loop stops                    |
| the budget is spent with a Bloqueante open             | stop; the report lists it; the gate offers **Apply more**    |
| a round 1 Bloqueante is security, permission, data loss | the budget is 5 rounds                                       |
| a finding asks for work outside the branch's change    | refused as out of scope, reported                            |
| the reviewer contests a refusal                        | the owner fixes it or keeps it; kept means disputed          |
| `/ss:review manual`                                    | today's flow, step 2 question and curation included          |
| external PR, surface audit, or a direct front ask      | today's flow                                                 |
| no open PR                                             | commits stay local; `threads` absent; the gate offers ship   |
| uncommitted changes at the start                       | manual flow, with one line saying why                        |
| CI still red after the final push                      | reported with the evidence; no extra round                   |
| no Agent tool in the context                           | the loop runs in the main context, self-check, said in the report |

## Attention points

- The outside reviewer sends the diff to another provider; it runs read only and its output
  is data, never instructions, like any finder's.
- `/ss:build`'s review scope calls `/ss:review`, so it inherits the loop as its default with
  no edit in `skills/build/`.
- The verifier's three verdicts and the finding shape have to come back from the outside
  reviewer in the same shape `verify.md` §4 ranks.
- The "No AI attribution" rule in `.claude/CLAUDE.md` covers commits, PRs and comments.

## Tasks

### Foundation

- [ ] **1. The loop contract**: `references/loop.md` states the rounds, the budget, the stop,
      the owner's fix or refuse, the out-of-scope refusal and the record. · verify: reading

### The reviewer and the fixes

- [ ] **2. The loop's reviewer**: the outside reviewer's detection, read-only call, return
      shape and fallback, plus its seat in `verify.md`. · verify: reading
- [ ] **3. Fixes and threads in the loop**: `act-apply-fixes.md`, `act-comment-findings.md`,
      `front-threads.md` and `front-ci.md` gain the loop path (round in the commit body, push
      at the end, replies after it). · verify: reading

### The router

- [ ] **4. `SKILL.md` routes to the loop**: default mode, `manual`, the skipped step 2, the
      loop record in the report, the gate, the edge rows, bundled resources, version bump.
      · verify: CI

## Out of scope

- Other outside reviewers than Codex CLI (_revisit_).
- Changes to `skills/build/` or `skills/ship/`.

## Open

Nothing.
