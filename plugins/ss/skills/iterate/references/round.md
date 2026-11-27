# A measured round

Step 4 of `/ss:iterate` reads this page before round 1: how a round runs when the judge is
`ss-iterate-judge`. The rule is `<plugin-root>/references/goal-loop.md` sections 4 to 10;
this page says what a measured target adds to each step.

## The loop folder

The folder of `goal-loop.md` section 9, with what a measured loop keeps:

```
<loop folder>/
├── state.json        # the goals with their bars, the check's command, the judge kind, the round, open findings, the trend
├── rounds/r0/        # the baseline: the check run before the first change
├── rounds/r<N>/      # each round's raw check output and the judge's return
└── tools/            # the check and its fixed inputs (calls, samples, scenarios, rubric), when they do not live in the repo
```

## A round

1. **Improve.** Work on what the last round left open: each goal `not_achieved`, from the
   gap the judge named, and each finding, from the most severe down, in batches by shared
   cause (`goal-loop.md` section 6). In round 1 the work starts from the baseline's gaps.
   Use `Agent` subagents for changes that run side by side. End at a clean step: committed,
   `state.json` written.
2. **Measure.** Run the check exactly as approved, its full output into `rounds/r<N>/`, and
   record the run in `state.json`. A run that errors is fixed in the check only when the
   error is the check's own (a fixture path, a port), said in the round's line; an error
   the target causes is a result.
3. **Judge.** One `Agent` call with `subagent_type: "ss:ss-iterate-judge"`, fresh and
   memoryless. Its prompt carries, in this order: the target and the repo path; the judge
   kind and its page's path; the goals with their bars, checks and deferred grounds; the
   check's command and path, and each change to it the person approved, with their words;
   the output paths of this round (and `rounds/r0/` in round 1); the approved differences
   when the kind has them; the round's work, scoped or full by `goal-loop.md` section 7. Never
   the owner's opinion or the history of the build. Record the agent's id in `state.json`.
4. **Decide.** Fix or refuse each finding with a ground, by `goal-loop.md` section 6. A
   `missing` entry is fixed by running what the judge asked for and handing it over.
5. **Show the trend**, by `goal-loop.md` section 8, with the measured values beside the
   bars: "round 3: G1 138 of 142 calls match, G2 p95 212 ms (bar 200 ms), 2 findings open;
   trend 9, 5, 2".

A scoped round that comes back pleased with every goal achieved is followed by a full pass:
the check run whole, every goal, as in round 1. Only a pleased full pass ends the loop.

When `Agent` cannot dispatch `ss:ss-iterate-judge`, run a `general-purpose` subagent with
`model: "sonnet"` whose prompt opens with the body of
`<plugin-root>/agents/ss-iterate-judge.md` below its frontmatter, verbatim, and say so in
one line and in the report.

## A number that moves the wrong way

A fix that makes a measured bar worse is reverted before the next round, unless it closes
another goal the person ranked higher. Say which in the round's line.

## The report

The report of `goal-loop.md` section 11, plus:

- **The baseline and the last measurement**, one line per goal: "G2 p95 latency: 340 ms →
  188 ms (bar 200 ms), 30 runs, spread 6 ms".
- **The check**: its command and where it lives, so the person can run it again.
- **The approved differences**, for parity, with who approved each.
- **The `/ss:review` verdict line**, when the run left a diff.
