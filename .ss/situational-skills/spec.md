---
status: in-progress
created: 2026-11-21
slug: situational-skills
---

# Situational skills, and proofs that survive a merge

Every rule ss holds today lives inside the skill that runs it. A rule two skills need is
written twice (the repro proof sits in `diagnose/SKILL.md` and again in `build-tasks.js`'s
`taskPrompt`), and a rule that only matters in one situation (a number was measured, the
same fix failed twice) has nowhere to live, so it is not written at all. The person drives
everything from `/ss:orchestrate`, and the work happens in agents that see only their
prompt: what reaches them is what the prompt says, and nothing tells them when a rule
applies.

This spec adds a layer of small skills an agent loads by itself, mid-task, when its
situation matches a trigger. The pattern comes from pstack (`cursor/plugins`), whose
`principle-*` skills are short, carry their trigger in their description, and reach a
worker through one kickoff line: "Read `<path>` before anything else." ss takes the
pattern, the four skills that pass its test, and two mechanisms beside them: a review lane
where a finding is proven by running it, and `git patch-id` so a verdict survives a merge
of the base that does not touch the branch's own change.

## The test for a situational skill

A piece of guidance becomes a situational skill when it passes all three:

1. **An observable trigger.** It can be written as "when X happens", and an agent
   recognizes X on its own, mid-task: a number was measured, the same gate failed twice, the
   task fixes a bug. Guidance with no trigger is a step of a skill, not a skill.
2. **Two consumers or more.** At least two skills or agents need it. Guidance with one
   consumer stays a section of that consumer.
3. **Judgment, not procedure.** What can run the same way every time becomes a script or a
   check (pstack's encode-lessons-in-structure), not prose.

The test is written at the top of the trigger table, so the next skill proposed is held to
it there.

Applied to what this spec considered:

| candidate                          | trigger | consumers                     | judgment | result                      |
| ---------------------------------- | ------- | ----------------------------- | -------- | --------------------------- |
| `explain-the-number`               | yes     | diagnose, build, review       | yes      | skill                       |
| `attack-the-premise`               | yes     | build, diagnose, ship CI loop | yes      | skill                       |
| `prove-the-fix`                    | yes     | diagnose, build repro tasks   | yes      | skill                       |
| `correct`                          | yes     | build, review loop, person    | yes      | skill, and a command        |
| `test-behavior-not-implementation` | yes     | build, diagnose               | yes      | folded into `prove-the-fix` |
| execution-proven findings          | yes     | review only                   | yes      | a lane of `/ss:review`      |
| patch-id comparison                | yes     | ship, orchestrate             | no       | a script                    |

## The trigger table

`<plugin-root>/references/triggers.md` holds the test above and one row per situational
skill: the trigger, the skill's path, and who reads it. An agent reads it whole as the
first thing it does, and loads a skill's `SKILL.md` by its path when the trigger fires.
Reading by path works whether or not the agent has the `Skill` tool.

The first line of each of these says "Read `<plugin-root>/references/triggers.md` before
anything else.":

- the `taskPrompt` of `build-tasks.js`, for every task agent;
- every orchestrate brief, ahead of the front marker;
- `/ss:diagnose`, `/ss:ship` and `/ss:correct`.

## The four skills

- **`explain-the-number`**: before measuring, and before trusting, reporting or acting on a
  number (a latency, a speedup, a regression, a throughput). Write the decision and the
  noise floor before the run; name what bounds the number ("why not double?") from a
  profile or counters, not from reading the code; list what else the number could be
  measuring (errors, cached or skipped work, code that never ran, an untuned side, noise)
  and rule each one out; five alternated runs, median and range. The verdict is one of
  `faster`, `slower`, `no measurable difference`, `inconclusive`.
- **`attack-the-premise`**: two fixes that failed the same gate share a premise. Write the
  premise down and test it directly before a third attempt that assumes it.
- **`prove-the-fix`**: the task fixes a bug. The reproduction fails before the fix and
  passes after; the focused test exercises the real code path the fix changes, asserts what
  a user of that code observes, fails without the fix and passes with it.
- **`correct`**: the same correction landed a second time. Encode it at the highest layer
  that holds it: the architecture, then a type, then a lint or CI check whose message says
  the fix, then a test, and documentation last. It runs as `/ss:correct` too.

## Decisions

- A situational skill is created only when it passes the three tests in "The test for a
  situational skill": an observable trigger, two consumers or more, and judgment rather than
  procedure. The test lives at the top of `references/triggers.md`.
- An agent learns which situational skills exist from `references/triggers.md`, which the
  first line of its prompt tells it to read before anything else. A skill's own description
  is not relied on to trigger it.
- Situational skills stay out of the slash menu and stay loadable by an agent. `correct` is
  the one exception: it is also the command `/ss:correct`.
- The twelve existing skills keep their shape. No skill is merged or removed by this spec.
- The repro proof's rules move into `prove-the-fix`; `diagnose/SKILL.md` and the repro
  branch of `taskPrompt` point to it instead of restating them. The trailer format stays
  written in one place.
- A performance bug in `/ss:diagnose` is proven with `explain-the-number`: the benchmark is
  the reproduction, and the fix counts as proven only on a `faster` verdict.
- When local runs are forbidden (`runnable: false`), the performance proof runs in CI with
  the same protocol. `inconclusive` and `no measurable difference` are legitimate results
  that reach the person as such, and the diagnose report never calls the bug fixed on them.
- In `/ss:review`, a `correctness` candidate with a concrete trigger (a command, an input, a
  test) is executed by its verifier when `runnable` is true: reproduced is CONFIRMED with the
  command and its output, not reproduced is REFUTED.
- When `runnable` is false, such a candidate is not executed: it stays PLAUSIBLE, marked
  "not executed", and never becomes CONFIRMED. Nothing is pushed to CI to prove a finding.
  A candidate with no concrete trigger keeps today's reading verdict.
- A correction is a fix someone asked for on code an agent wrote (the review loop, a PR
  thread, the person through a front), named by its class of error. Each class is one wiki
  fact; each new occurrence appends a source to it.
- The second source on a correction fact triggers `correct`. It runs on its own branch and
  PR, because a new check can fail on code outside the spec that surfaced it.
- In a standalone build, the build's final report names the class and proposes
  `/ss:correct`. In an orchestrate run, the orchestrator brings it to the person as a
  question with opening a `correct` front as the recommended pick.
- `/ss:build` records the corrections. Its wiki pass already records the task agents'
  choices, and when the run's scope includes the review, a second short pass after the loop
  records the corrections the loop applied, on the run branch.
- `/ss:correct` becomes the wiki's third writer, in its own lane: on its branch, it only
  supersedes the correction fact it encoded, with a fact naming the check that now enforces
  the rule.
- A check `correct` adds must fail on a real past occurrence of the error. One that does not
  is not landed, and the report says so.
- When the new check fails on existing code of the same class, `correct` fixes those
  occurrences in the same branch, so the rule holds the day it lands.
- The target repo's `CLAUDE.md` keeps a table of each rule and what enforces it. When a
  check starts enforcing a rule, the rule's prose leaves `CLAUDE.md` and its row stays,
  naming the check.
- A correction that needs judgment and cannot become a check stays prose in `CLAUDE.md`,
  made more prominent and given an example of the failure. Its row says "prose".
- A review verdict carries the patch-id of the branch's own change (the diff from the
  merge-base to the head) at the moment it was given.
- `/ss:ship` and the orchestrator's landing compare that patch-id with the branch's current
  one. Equal means the verdict still holds, even when the base was merged in since. Different
  means the review read code that has since changed.
- On a different patch-id, the orchestrator does not merge: it asks the front to review the
  delta first. `/ss:ship` says in the PR that the verdict predates the last change.
- A branch with no recorded verdict ships and lands as it does today.
- When a `Repro-test-commit` sha is no longer on the branch (its history was rewritten, as
  `/ss:takeover`'s modernize does), `/ss:ship` finds the commit with the same patch-id on the
  branch. With none, the proof is missing, as it is today.

## Behavior

Happy path, a performance bug through orchestrate, local runs forbidden:

1. The person reports "the export got slow" to the orchestrator, which opens a
   `/ss:diagnose` front. The brief's first line sends the front to `triggers.md`.
2. The front reads the table, finds the cause, and its reproduction is a benchmark: the
   `explain-the-number` trigger fires and the front loads it by path.
3. It writes the decision and the noise floor, names the limiter, and commits the benchmark
   with the fix.
4. CI runs five alternated runs before and after: median and range give `faster`, with the
   limiter named. The report carries the verdict, the runs and the limiter.
5. The front's review loop gives its verdict at patch-id P. The front then merges `main`
   into its branch; the patch-id is still P.
6. The orchestrator, authorized to merge, compares P with the branch's current patch-id,
   finds them equal, and merges with the head pinned.

Happy path, a correction that repeats:

1. In a build of spec A, the review loop applies a fix of class "unchecked `gh` exit code".
   The build's second wiki pass records a correction fact with one source.
2. A week later, a build of spec B gets the same correction from the loop. The pass appends
   the second source.
3. The orchestrator relays the build's report and asks the person whether to open a
   `correct` front. The person says yes.
4. `/ss:correct` writes a check that fails on the commit of the first occurrence, fixes the
   two other places in the repo that fail it, adds the row to `CLAUDE.md` and removes the
   rule's prose, and supersedes the correction fact with one naming the check. It opens its
   PR.

| WHEN                                                                           | THEN                                                                                    |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| a skill under `skills/` is marked situational and has no row in the table      | CI fails, naming the skill                                                              |
| a row of the table names a skill that does not exist                           | CI fails, naming the row                                                                |
| the person types `/ss:` in the menu                                            | `correct` shows; the other situational skills do not                                    |
| a task agent's environment has no `Skill` tool                                 | it reads the skill's `SKILL.md` by the path the table gives                             |
| a measured effect is smaller than the run-to-run spread                        | the verdict is `inconclusive`; nothing is reported as faster                            |
| a performance fix gives `slower`                                               | the fix is wrong; diagnose goes back to the cause                                       |
| a performance proof in CI ends `inconclusive` or `no measurable difference`    | the person gets that verdict with the runs; the report does not call the bug fixed      |
| a task agent's second fix fails the same gate as the first                     | it loads `attack-the-premise`, writes the premise and tests it before a third attempt   |
| a `correctness` candidate has a trigger and `runnable` is true, reproduced     | CONFIRMED, with the command and its output                                              |
| a `correctness` candidate has a trigger and `runnable` is true, not reproduced | REFUTED                                                                                 |
| a `correctness` candidate has a trigger and `runnable` is false                | PLAUSIBLE, marked "not executed"; the loop decides it as it decides any PLAUSIBLE       |
| a candidate has no concrete trigger                                            | the verifier gives today's reading verdict                                              |
| a correction class is seen for the first time                                  | one fact with one source; nothing else happens                                          |
| a correction class gets its second source                                      | the build report proposes `/ss:correct`; in orchestrate, the person is asked            |
| the check `correct` wrote passes on the past occurrence                        | it is not landed; the report says the check does not catch the error                    |
| the new check fails on existing code of the same class                         | `correct` fixes those occurrences in the same branch                                    |
| the correction needs judgment and no check can hold it                         | the rule stays prose in `CLAUDE.md`, with an example of the failure; its row says prose |
| the target repo has no `CLAUDE.md`                                             | `correct` creates it with the table                                                     |
| the base was merged into the branch after the review verdict                   | patch-id unchanged; the verdict holds and the orchestrator may merge                    |
| a CI fix landed after the review verdict                                       | patch-id changed; the orchestrator asks for a review of the delta before merging        |
| `/ss:ship` finds a verdict older than the patch                                | the PR says the verdict predates the last change                                        |
| the branch has no recorded verdict                                             | ship and landing behave as today                                                        |
| `Repro-test-commit` names a sha no longer on the branch                        | ship finds the commit with the same patch-id; with none, the proof is missing           |

## Attention points

- `build-tasks.js` keys its resume cache on the prompt. A new first line in `taskPrompt`
  changes every task's key once, so a run resumed across the upgrade rebuilds its tasks.
- `PROOF_TRAILERS` in `build-tasks.js` is the one place the trailer form is written, and
  `ship/SKILL.md` reads it back. `prove-the-fix` must not become a second spelling of it.
- Hiding a skill from the slash menu must not stop an agent from loading it: the
  frontmatter flag that hides it from the person and the one that blocks the model are
  different flags. Whether a Workflow `agent()` has the `Skill` tool is not confirmed.
- `ss-review-verifier` is read only by contract and has `Bash`. Executing a trigger can
  write files, start processes or touch the network, inside the reviewed repo.
- The review verdict's patch-id has to be stored where `/ss:ship` and the orchestrator can
  read it from the PR alone, since the orchestrator does not see the front's transcript.
- `git patch-id` over a diff that includes a merge of the base: the diff from the merge-base
  must exclude the base's changes, or every merge of `main` changes the patch-id.
- `references/wiki-state.md` says two skills write the wiki, and the build's pass runs
  before the review. A second pass and a third writer change that contract, and
  `validate_wiki.py` validates the fact frontmatter.
- A check that `correct` proves against a past occurrence needs that occurrence to be
  runnable in CI when `runnable` is false.
- The benchmark's five alternated runs in CI share a runner with noisy neighbors; the noise
  floor has to be measured there, not assumed.

## Tasks

### Phase 1: the table

- [x] **1. Trigger table and its check**: `references/triggers.md` with the three-test rule
      and one row for each of the four skills, and a CI check that every situational skill has
      a row and every row a skill. · verify: CI

### Phase 2: the skills and the mechanisms

- [x] **2. explain-the-number**: the skill, out of the menu. · verify: reading
- [x] **3. attack-the-premise**: the skill, out of the menu. · verify: reading
- [x] **4. prove-the-fix**: the skill with the repro proof's rules and the
      test-behavior rule, out of the menu. · verify: reading
- [x] **5. /ss:correct and the correction facts**: the skill and command; the correction
      fact and the third writer in `wiki-state.md` and `validate_wiki.py`; the build's second
      pass after the review loop and the report line that proposes `correct`. · verify: CI
- [x] **6. Execution-proven findings**: the lane in `review/references/verify.md` and the
      verifier's rubric, gated on `runnable`. · verify: reading
- [x] **7. Patch-id**: a script that prints the branch's patch-id; the review loop records
      it with the verdict; `/ss:ship` compares it and resolves a missing `Repro-test-commit`;
      the orchestrator's landing compares it before a merge. · verify: CI

### Phase 3: the wiring

- [x] **8. Kickoff in the build and the briefs**: the first line of `taskPrompt` and of
      every brief reads `triggers.md`; the repro branch of `taskPrompt` points to
      `prove-the-fix`; the orchestrator relays a proposed `correct` as a question. · verify: CI
- [x] **9. Kickoff and the performance path in diagnose and ship**: `diagnose` and `ship`
      open by reading `triggers.md`; `diagnose` points to `prove-the-fix` and proves a
      performance bug with `explain-the-number`. · verify: reading

### Phase 4: the record

- [ ] **10. Docs and versions**: the repo's `CLAUDE.md` structure, the README and each
      touched skill's version name the new skills and the table. Version bumps happen here
      only, so the tasks before it leave `metadata.version` as it is. · verify: reading

## Out of scope

- Merging, removing or reshaping any of the twelve existing skills.
- Counting corrections made outside a build (a `/ss:diagnose` run, a direct edit).
- pstack's autonomous merge, never-block-on-the-human and per-role multi-vendor routing:
  each contradicts ss's frame (irreversible actions stay manual, decisions go through the
  question tool).
- Proving a review finding in CI when local runs are forbidden.

## Open

Nothing.
