---
name: iterate
description: Improves something that already exists until a measurable bar is met. Runs when there is a target and a bar (parity with an old API, a benchmark, a flaky test's pass rate, a bot's behavior, a prompt's output, a document against a rubric); solves "keep improving" with no measure of done. Settles the bars through /ss:clarify in one sheet, picks the judge (a parity harness, a benchmark, test reruns, a conversation judge, the design critic, the code reviewer, or your rubric), runs the goal loop until every bar is met and the judge is pleased, then /ss:review on the diff. Outputs the measured trend, the goals line and the verdict. Use when the user says "iterate", "iterate on this", "until parity", "até ter paridade", "until it passes", "until it's faster", "melhore até", "itera nisso", "keep improving until". Don't use it for a new feature (use /ss:clarify), a bug (use /ss:bug-fix), or a diff to judge once (use /ss:review).
license: MIT
metadata:
  author: Athena Briana - github.com/athenabriana
  version: 1.0.1
---

# Iterate

`<plugin-root>` is `${CLAUDE_PLUGIN_ROOT}`: use that directory wherever this skill or a page it
reads writes `<plugin-root>`.

- **The goal:** an existing target that meets a measurable bar, proven by a check that can
  be trusted.
- **When it happens:** something exists and the work is improve, measure, repeat: "make the
  new API match the old one", "until the benchmark is under 200 ms", "until the test passes
  100 times in a row", "until the bot stops doing X".
- **What it solves:** open-ended "keep improving" with no measure of done, and a bar met by
  bending the check instead of the target.
- **What it outputs:** the baseline and the measured trend per round, the `Goals:` line, the
  judge's last verdict, and the `/ss:review` verdict line when the work left a diff.

This skill is the door to the goal loop of `<plugin-root>/references/goal-loop.md`, the one
loop engine of ss. `goal-loop.md` holds the rule (goals approved once, a fresh judge each
round, fixes in batches, scoped rounds then a full pass, the loop folder, when it stops);
this skill adds the target, the judge and the measurement. Other doors run the same engine
with their judge fixed: `/ss:ui-critique` with the design critic and the a11y auditor, and
`/ss:review` with the code reviewer.

Hard limits: the check is fixed once the goals are approved, and changing it is a goal
change that needs the person's word; pushing and a PR are `/ss:ship`'s; `/loop` is Claude
Code's own recurring command and has nothing to do with this skill.

## 1. Confirm the target

Name what is being improved and where it lives: a service, an endpoint set, a test, a
prompt, a bot, a document, a screen. When the request points at two candidates, ask which
one through the question tool. A screen goes to `/ss:ui-critique`, which runs this loop with
the design judges: say so in one line and hand it over. A target that does not exist yet is
a feature: say so and offer `/ss:clarify`.

Read the loop folder first (`goal-loop.md` section 9): a `state.json` there means a
restart. Resume it, and never start round 1 over.

## 2. Settle the goals and the bar

Run `/ss:clarify` on the target, with the request as its ground. Its goals are the bar: each
one a WHEN/THEN line whose check is the measurement ("WHEN the 142 recorded calls replay on
both APIs THEN every response matches after normalization, or its difference is approved").
Its blocks join the one decision sheet of `<plugin-root>/references/long-run.md`, beside:

- **The judge kind**, from step 3, the recommended one first.
- **The cap**, when the person may want one ("at most 5 rounds"); none by default.
- **The endpoint**: local commits, or handed to `/ss:ship` at the end for a pushed branch
  or a PR.

Goals that already exist skip clarify, by `goal-loop.md` section 1. After the sheet the run
goes to the end and asks again only on a real blocker.

## 3. Choose the judge

Read `references/judges.md` before choosing: the table of judge kinds, what every
trustworthy check shares, and when a kind's check must be built first. Pick by the target:

| the bar                                    | judge kind     | read                               |
| ------------------------------------------ | -------------- | ---------------------------------- |
| behaves like another system                | parity harness | `references/judge-parity.md`       |
| a number: latency, throughput, size        | benchmark      | `references/judge-benchmark.md`    |
| a test passes, every time                  | test reruns    | `references/judge-tests.md`        |
| a bot or agent behaves in conversation     | conversation   | `references/judge-conversation.md` |
| output or text scored against a rubric     | rubric         | `references/judge-rubric.md`       |
| a screen                                   | design         | `/ss:ui-critique`                  |
| code quality of a diff, nothing to measure | code reviewer  | `/ss:review`                       |

Build the check before the first change and run it once as the **baseline**, into
`rounds/r0/`. A check that cannot run on the baseline is fixed before anything else.

## 4. Run the loop

Read `references/round.md` before round 1: how a measured round runs on `goal-loop.md`
sections 4 to 10. Each round improves the target, measures it, sends a fresh
`ss:ss-iterate-judge`, decides every finding and shows the measured trend; scoped after
round 1, then a full pass. Read `<plugin-root>/references/triggers.md` once before round 1,
since a measured loop fires its rows. The loop stops only by `goal-loop.md` section 10.

## 5. Review the diff, then report

When the run left a diff, run `/ss:review` on it in its default loop (deep when the
target touches tokens, secrets, auth, permissions, servers or money): a bar met is not a
review. Its verdict line goes into the report and, on the PR path, the PR description.

Then report by `goal-loop.md` section 11, with what `references/round.md` "The report"
adds: the baseline, the measured trend per goal, and the check's location so the person can
run it again.

## 6. Gate

In a work session `/ss:orchestrate` opened, the gate goes through
`<plugin-root>/references/front-contract.md`. Otherwise one question by
`<plugin-root>/references/handoff-gate.md`, the first options that apply:

1. stopped at a cap or the usage window with goals open → **"Run more rounds"**
2. commits on a branch → **"Ship it: I run /ss:ship"**
3. always last → **"Stop here"** (what stays: the commits, the check and the report; how to
   resume: `/ss:iterate`)

## Bundled resources

- `references/judges.md`: the judge kinds, the trustworthy check, building it first.
- `references/round.md`: a measured round on the goal loop, and the report.
- `references/judge-parity.md`, `judge-benchmark.md`, `judge-tests.md`,
  `judge-conversation.md`, `judge-rubric.md`: one judge kind each.
- `<plugin-root>/agents/ss-iterate-judge.md`: the judge of a measured round.
- `<plugin-root>/references/goal-loop.md`: the loop engine every door runs.
- `<plugin-root>/references/design-loop.md`: the design judge, run by `/ss:ui-critique`.
