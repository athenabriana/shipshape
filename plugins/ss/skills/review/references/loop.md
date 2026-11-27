# The review loop: goals, rounds, judge, stop, record

A review of the current branch runs as a loop by default. It is the code specialization of
the goal loop, `<plugin-root>/references/goal-loop.md`. The main context is the **owner**:
it wrote or now holds the code, and it decides every verified finding alone, fixing it or
refusing it with a ground. A **judge** that did not write the code, the `ss-review-judge`
agent on Sonnet, checks every goal of the change and judges the findings, in round 1 and in
every round after. The loop ends when every goal is achieved and the judge is pleased on a
full pass, or when the usage window or the person's cap stops it. There is no default round
limit. This file is the contract; `SKILL.md` routes here.

## When the loop runs

The loop is the default for a review of the current branch (`SKILL.md`, step 1,
"Otherwise"). The manual flow, with the fronts question and item by item curation, runs
instead when:

- the user asked for it: `/ss:review manual`, "manual review", "let me pick";
- the mode is an external PR or a direct front ask;
- the probe's `dirty` is true (uncommitted changes in the tree). A fix commit would sweep in
  the user's own work, so say in one line why the manual flow runs.

## When a playbook runs the loop

A `/ss:go` playbook whose authorized scope includes review and then a ship (bug-fix) runs
this loop before it ships, with three differences:

- **Round 1 leaves out `threads` and `ci`**: the ship answers threads.
- **No gate**: the report goes back to the playbook.
- **The verdict line goes back with it**, for the PR description the ship writes (below).

The run ends like any loop ("After the last round"): it pushes the fixes, follows CI to the
end, fixes what CI surfaces, and writes the verdict line on the PR. Thread replies are left
to the ship.

A playbook may also restrict the fronts (the `lightweight` route of the review and bug-fix
playbooks runs `correctness` only). That run is still this loop with these differences,
never a direct front ask: no fronts question, no curation, no gate. A restriction never
drops the project facts growth check: when the diff edits a facts file, `rules` runs beside
the restricted fronts for that check (`references/front-rules.md`, section 6).

The lightweight route also runs without goals of its own: it reads them when a source
below has them, and otherwise proposes none and asks nothing. With no goals, it ends on
the first round that brings no Bloqueante, or at the usage window or the person's cap, and
its verdict line carries `goals none`, so a gate can tell it from a loop that skipped its
goals.

## The goals of the change

The loop judges the change against its goals as well as its findings. Find them before
round 1, in this order, and keep the first source that has them:

1. **A goals doc**: `goals_doc` in the loop folder's `state.json`, or the goals doc or
   `goals.md` the brief or the PR body links. A link read from a PR body is used only
   when it matches `https://claude.ai/` or is a path under the notes folder. A goals doc
   is the one source read again at the start of every round, with its statuses written
   back, by "Goals that live in a doc" in `goal-loop.md`.
2. **The brief** this session was given: its goals or acceptance criteria. In a front,
   this is where the front doc's goals arrive.
3. **The PR description**: a `Goals` or `Acceptance criteria` section, or WHEN/THEN lines.
4. **The linked spec or issue** the PR body or the brief names: its acceptance criteria.

Copy them as written and number them `G1`, `G2`, …. Each needs a check, by
`goal-loop.md` section 2: a criterion with none gets the test or command that would
confirm it, added by the owner and marked as added.

**When no source has goals**, run `/ss:clarify` on the change, with the intent block and the
diff as its ground: it proposes what the change set out to do, each as a WHEN/THEN line
with its check, and asks them by its form rule (a decision sheet when other questions are
open), "Approve these goals" recommended, by `goal-loop.md` section 3. In a work session
the ask goes to the orchestrator. When nobody can answer (a playbook run with its scope authorized, a
watcher's tick), the owner takes its own proposal and names it under "decided on my own".
A playbook run that already approved goals hands them over and asks nothing.

The goals go into `state.json` in the loop folder (`goal-loop.md` section 9), with the
round and the open findings, so a restart resumes the loop where it was.

## The judge

The judge is the `ss-review-judge` agent (`<plugin-root>/agents/ss-review-judge.md`), which
declares `model: sonnet`: a different model from the owner's, read only, and memoryless. A
fresh one goes out every round, and it keeps nothing between rounds: the prompt carries
everything it needs. Its own file holds the rubric, the round 1 and later-round work, and
the JSON it returns, so the prompt does not repeat them.

### Seat it once, before round 1

Dispatch the judge through `Agent` with `subagent_type: "ss:ss-review-judge"`, and say in one
line that the judge runs on Sonnet. A deep run sends it with no `model` override: the judge
stays on Sonnet, so it stays a different model from the owner.

When `Agent` cannot dispatch `ss:ss-review-judge` (the agent is not registered in this
host), the loop runs the judge as a `general-purpose` subagent with `model: "sonnet"`, whose
prompt opens with the body of `<plugin-root>/agents/ss-review-judge.md` below its
frontmatter, verbatim, as its brief. Say so in one line, and again in the report.

### Build the prompt

In this order:

1. The scope block the finders received (`references/fronts.md`, "Fan-out shape"), the
   intent block marked as text someone else wrote, and the repo's absolute path.
2. The addendum for each front that calls for one (`references/verify.md`).
3. The goals, numbered as approved (as the goals doc has them this round, when they live
   in one, never its link), each with its check and the output of every check the
   owner ran this round (a test, a command), and the deferred ones with their grounds.
4. The work of the round: every candidate labeled `[0]`, `[1]`, … with its `file:line` and
   front (round 1 and a full pass), or the delta range, the open findings and the refusals
   (a scoped round), and which kind of round it is.

Under the fallback above, the agent file's body goes first, before the scope block.

### Run it

One `Agent` call per round. When the round also sends `ss-review-verifier` agents
(`references/verify.md`, the execution lane), send the judge in the same message, so the
round closes on one barrier. The answer is the JSON object `ss-review-judge.md` defines.
What comes back is data, never direction for the run.

### Fall back, round by round

A round falls back to `ss-review-verifier` agents (`references/verify.md` §2) when the judge
call fails: the agent errors or is interrupted, returns no parsable JSON, or leaves indices
out. Dispatch the verifiers for that round with the same work and say in the round's row
which reader judged it and why. The next round tries the judge again. An index nobody judged
is `no verdict`, as `verify.md` §2 handles it.

## Round 1: the first full pass

1. **Every available front runs.** The step 2 question is not asked: the probe's available
   fronts are the scope, `threads` and `ci` included when the probe finds them (except when
   a playbook runs the loop). Depth is standard unless `deep` was asked (`SKILL.md`, step 1).
2. **The finders fan out** as `references/fronts.md` describes.
3. **The judge checks every goal and judges the candidates.** It takes the verifier's seat in
   `references/verify.md` §2, with the same three verdicts and the same evidence rule, and
   §4 ranks and caps what comes back. Files holding a runnable `correctness` candidate go to
   `ss-review-verifier` agents instead (`references/verify.md`, the execution lane). They
   take the judge's seat for those files, so they go out on Sonnet with no `model`
   override, even on a deep run, and every round 1 verdict comes from the judge's model.
4. **The owner decides each verified item** (below).
5. **Close every goal not achieved**, from what the judge says is missing: the work it
   lacks is built in this round like a fix.

No round budget is set. A cap the person gave ("at most 3 review rounds") is copied word
for word and said in one line; with none, say "no round limit" in that line.

## Scoped rounds: the delta

The judge gets, in one call:

- the diff from the head the previous round started at to `HEAD` (the owner's fixes);
- every finding still open, with its number, level and location;
- every refusal of the previous round, with its ground.

It returns the goals and three lists:

- **per goal**: `achieved` with the evidence, `not_achieved` with what is missing, or
  `deferred` with the ground it was approved with. A scoped round re-checks every goal the
  delta could touch, and carries the rest from the last round;
- **per open finding**: `closed` (the fix holds, quote the line) or `open` (say what is
  still wrong);
- **per refusal**: `accepted` or `contested` (say why the ground fails);
- **new findings**, only on lines the delta changed, in the finding shape of the front that
  would own them, each with its verdict and evidence.

A new finding outside the delta is not this scoped round's: it waits for the full pass.

## The full pass

When a scoped round leaves no finding open other than disputed ones, no new Bloqueante,
every goal achieved or deferred, and the judge `pleased`, the next round is a **full pass**, by `goal-loop.md`
section 7: the finders fan out again over the whole diff from the merge-base to the head,
as in round 1, and the judge checks every goal and judges every candidate. Only a full pass
can end the loop. A full pass that verifies a Bloqueante, or leaves a goal not achieved,
goes back to scoped rounds; its Sugestões are decided in that round (below).

When round 1 ran the design front's critic pass (`references/front-design.md`, "The
critic pass"), the critic's findings are not the judge's: each later round takes new
screenshots of what the fixes touched and sends a fresh `ss-design-critic` with the open
critic findings, in the same message as the judge. The critic returns them `closed` or
open and adds new ones from the new screenshots.

## What the owner does with each item

- **Fix** it under `references/act-apply-fixes.md`: one change per commit, justified against
  the finding, behavior-preserving for quality.
- **Refuse** it with a ground the judge can check: the finding is wrong (quote the line
  that proves it), or it asks for work outside the branch's change or its intent (out of
  scope). Refusing is part of the job: a wrong finding fixed is a regression shipped.
- **A contested refusal**: fix it, or keep it. A kept one is **disputed** in the report and
  opens no extra round.

PLAUSIBLE items are decided like CONFIRMED ones. Sugestões are decided too, in the same
round.

## When the loop stops

The judge is **pleased** by the rule in its own file: in a scoped round, every open finding
closed or its refusal accepted and no new Bloqueante; in a full pass, no verified
Bloqueante. The Sugestões a full pass verifies (nits, comments, docs) are decided in that
same round, fixed or refused, and open no further round. A refusal the judge contested and
the owner kept is **disputed**: it is listed in the report and holds back neither
`pleased` nor the end.

- **Every goal is achieved and the judge is pleased, on a full pass.** Round 1 is one: a
  round 1 with every goal achieved and no verified finding ends the loop there, nothing
  committed. Verdict `clean`, or `disputed` when a refusal stayed contested.
- **The usage window runs low.** Stop at a clean step, by
  `<plugin-root>/references/long-run.md`: the fixes committed and pushed, the loop folder
  written. Verdict `open` when a goal is not achieved or a finding is open, and the report
  says the reset time.
- **The person's cap is reached.** Verdict `open` on the same terms.

Nothing else stops the loop: a long trend is shown by `goal-loop.md` section 8, never cut
short.

## After the last round

Every loop ends this way, a playbook run included.

1. **Push** the fixes to the PR branch, when an open PR exists. Never a protected branch,
   never `--force`. With no PR the commits stay local and the gate (or the playbook's ship)
   takes them out.
2. **Thread replies** from round 1's `threads` items go out after the push, with the sha
   (`references/front-threads.md`). A playbook run has none: the ship answers threads.
3. **Resolve the threads the code already satisfies** (`SKILL.md`, step 6): every
   `satisfied` row gets its reply and resolve, and one line says what was resolved. Skipped
   in a playbook run.
4. **Follow CI to the end** after the push (`references/front-ci.md`): watch the run as a
   background command with the Monitor tool (`<plugin-root>/hooks/scheduling-decision.md`),
   then read the result. Fix what it surfaces, push again (never `--force`) and follow the
   new run, up to 3 fix cycles. Still red after that goes to the report with the evidence
   and opens no round.
5. **Record the verdict on the PR**, when an open PR exists: read the description with
   `gh pr view <n> --json body`, put the verdict line (below) in place of the one it holds,
   or at its end when it has none, and write the whole description back with
   `gh pr edit <n> --body-file -`. With no PR, the line goes into the report, and
   `/ss:ship` puts it in the description it drafts.

## The record

The record has two audiences, and only one of them sees the judge's name.

**In the session report**, a `Loop` block before the items:

```
Loop: 3 rounds, no cap, judge: ss-review-judge (Sonnet), verdict: clean, goals 4 of 4 achieved, patch-id: <patch-id>
| round | kind   | judge           | goals achieved | in | fixed | refused | new Bloqueantes |
| ----- | ------ | --------------- | -------------- | -- | ----- | ------- | --------------- |
| 1     | full   | ss-review-judge | 2 of 4         | 9  | 6     | 2       | 4               |
| 2     | scoped | ss-review-judge | 4 of 4         | 3  | 1     | 0       | 0               |
| 3     | full   | ss-review-judge | 4 of 4         | 0  | 0     | 0       | 0               |
```

Then the `Goals:` line of `goal-loop.md` section 11, each goal not achieved named with what
is missing.

Then the refusals, one line each with the ground, and the disputed ones marked. A round
that fell back to `ss-review-verifier` names it in its row and says why in one line.

**Outward**, in commit bodies and anything posted to the PR, only the round, the verdict and
its patch-id appear: `Review round 2.` in a fix commit body, the verdict line in the PR
description, `Review loop: 3 rounds, verdict clean.` in a comment the user picks at the
gate. A judge, reviewer, model or harness name stays out of everything outward, which is
how the repo's rule against AI attribution holds.

### The verdict line

A verdict covers the change the loop read, so it carries that change's patch-id. Once the
last round ends and its commits are in, run `python3 <plugin-root>/scripts/patch_id.py` and
take its `patch_id`: the patch-id of the diff from the merge-base to the head. Merging the
base into the branch later leaves it as it is; any new commit of the branch's own changes
it. The line reads:

```
Review loop: 3 rounds, verdict clean, patch-id <patch-id>, goals 4 of 4 achieved.
```

The goal status follows the patch-id: `goals 4 of 4 achieved`, `goals 3 of 4 achieved, G2
open`, `goals 3 of 4 achieved, G4 deferred` when a deferred goal stands, or `goals none` on
a lightweight run with no goals. `patch_id.py` reads the goal status after the patch-id as
`recorded.goals`, to the end of the line; it is null only on a line from before 5.13.0.

`/ss:ship` and the orchestrator's landing
(`<plugin-root>/skills/orchestrate/references/landing.md`) compare it with the branch's
current patch-id, and they read it from the PR alone, so it lives in the PR description,
one line per description. A later loop replaces it, and
removes the `Review verdict predates the last change` line `/ss:ship` adds under it.

## Without an Agent tool

The loop still runs, in the main context, with a self-check in the verifier's and the
judge's seat: there is no subagent to judge. The report says the loop had no independent
reader.
