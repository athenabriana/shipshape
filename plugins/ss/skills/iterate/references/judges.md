# The judge kinds

Step 3 of `/ss:iterate` reads this page: which judge fits the target, what every
trustworthy check shares, and how the check is built before the first change. Each kind has
its own page beside this one.

## Pick the kind

| judge kind     | the target and its bar                                                  | the check                                                     | who judges                               |
| -------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------- | ---------------------------------------- |
| parity harness | a new system that must behave like an old one (an API, a CLI, a parser) | the same calls on both sides, responses normalized and diffed | `ss-iterate-judge`                       |
| benchmark      | a number to reach: latency, throughput, memory, bundle size, cost       | a runner with warmup, repeats and the spread                  | `ss-iterate-judge`                       |
| test reruns    | a test that must pass every time, or a suite's pass rate                | the test run N times, each run's result kept                  | `ss-iterate-judge`                       |
| conversation   | a bot or an agent that must behave a certain way in conversation        | scripted conversations replayed, transcripts graded per goal  | `ss-iterate-judge`                       |
| rubric         | a prompt's output, a document, a generated text against criteria        | the rubric applied per criterion to a fixed set of samples    | `ss-iterate-judge`                       |
| design         | a screen                                                                | screenshots, by `<plugin-root>/references/design-loop.md`     | `ss-design-critic` and `ss-a11y-auditor` |
| code reviewer  | a diff whose bar is its quality and its goals, with nothing to measure  | the review fronts, by `/ss:review`                            | `ss-review-judge`                        |

When two measured kinds fit, take both: each goal names its own check, and one round runs
every check before `ss-iterate-judge`. When a measured kind meets a screen goal or a pure
code-quality goal, the measured goals stay on `ss-iterate-judge`, and the other goes to its
own door (`/ss:ui-critique` or `/ss:review`) after the loop. A target with no measurable
bar at all is not this skill's: ask the person for a rubric (the rubric kind), or send it
to `/ss:review`.

## What every trustworthy check shares

The judge can only be as honest as the check. Every kind's check has these, and its own
page adds the rest:

- **Fixed before the first change.** The check, its inputs and its thresholds are written
  and approved with the goals. Changing any of them after that is a goal change: ask the
  person, by `<plugin-root>/references/long-run.md` "real blocker". A check edited so the
  target passes is the one failure this skill exists to prevent.
- **A baseline.** Run once on the untouched target, into `rounds/r0/`, so every later
  number reads against it.
- **Deterministic where it can be.** Fixed inputs, fixed seeds, fixed clocks, recorded
  fixtures in place of live services. What cannot be fixed (timing, a model's output) is
  repeated and its spread kept.
- **Raw output kept.** Each run writes its full output to `rounds/r<N>/`, and the judge
  reads that file, never a summary of it.
- **Runs from one command.** The check lives in the loop folder's `tools/` or in the repo,
  named in `state.json`, so a fresh judge, a restart or the person can run it again.
- **Covers the bar, all of it.** Every call, case, run or sample a goal names is in the
  output. A skipped or erroring one counts as not met, never as absent.
- **Separate from the target.** The check does not import the code under change where it
  can avoid it, and the target never learns the check's inputs (no special case for a
  recorded request, no prompt tuned on the graded samples alone).

## Build the check first

When the repo has no check of the kind, building it is the first piece of work, before any
change to the target:

1. Write the check under `tools/` in the loop folder, or in the repo when it should stay
   (a benchmark the project keeps, a parity test suite). Python stdlib or the project's own
   test runner, whichever the target already uses.
2. Run it on the baseline. Fix the check, never the target, until it runs end to end.
3. Put its command, its inputs and the baseline's numbers in the decision sheet with the
   goals, so the person approves the bar and the way it is measured together.

When the check needs something this session cannot reach (production traffic, a paid
service, the old system offline), that goal is deferred with its ground at approval, by
`<plugin-root>/references/goal-loop.md` section 2.
