---
name: explain-the-number
description: Situational guidance an agent reads by the path references/triggers.md gives, before it measures a number or before it trusts, reports or acts on one (a latency, a speedup, a regression, a throughput). Write the decision and the noise floor before the run, name what bounds the number from a profile or counters, rule out what else the number could be measuring, and take five alternated runs per side. The verdict is one of faster, slower, no measurable difference, or inconclusive. Read by the bug-fix playbook of /ss:go and by any session measuring a number. Stays out of the slash menu.
license: MIT
user-invocable: false
metadata:
  author: Athena Briana - github.com/athenabriana
  version: 1.0.1
  kind: situational
---

# Explain the number

You read this page because you are about to measure a number, or to trust, report or act on
one: a latency, a speedup, a regression, a throughput. A number by itself says nothing about
the change you care about. It could be measuring errors, a cache, work that never ran, or
noise. This page turns the number into one of four verdicts, `faster`, `slower`,
`no measurable difference`, or `inconclusive`, and keeps with it what the verdict rests on.

The same steps hold for a number someone else measured, in a PR body, a review finding or a
report. Ask for what a step needs; in a front, that question goes through
`<plugin-root>/references/front-contract.md`. A step nobody can answer makes the verdict
`inconclusive`.

The sections below run in order. The first two happen before any run you report.

## Write the decision and the noise floor

Before the first run, write down three things where the person will read them: the commit,
the PR body, or your report.

1. **The claim you expect to make**, in the words you would ship: "the export is 30% faster
   at p50 on the 60k row dataset".
2. **The decision the number feeds**, and the smallest effect that would change it: "keep
   the fix only if p50 drops by 10% or more". That smallest effect is the _threshold_.
3. **The noise floor**: how far apart two runs of the same code land in this environment.
   Measure it, never assume it. Run the unchanged side five times in the environment the
   real runs will use, and take the range. A noise floor taken on your machine says nothing
   about a CI runner, and the reverse holds too.

When the noise floor is as large as the threshold or larger, this setup cannot answer the
decision. Make the run quieter or longer (more iterations per run, a larger dataset, a
dedicated runner) before you measure the change. When nothing makes it quieter, the verdict
is already `inconclusive`: say so and stop.

## Name what bounds the number

Ask "why not double?": what resource or code path stops the number from being twice as good.
Answer from evidence taken during a run, never from reading the code:

- a profiler (`node --cpu-prof`, `py-spy`, `perf`, the runtime's own);
- CPU per process (`top`, `pidstat`), I/O wait, and syscall counts (`strace -c`);
- the load generator itself, which can saturate before the system under test does.

Profile in a run you do not report, because a profiler slows the work it watches. Map the
hot spot back to the source. That hot spot is the _limiter_, and it travels with the number.
When a change does not move the number, the limiter is what explains why.

## Rule out what else the number could be measuring

List each of these, and rule each one out with evidence from a run:

- **Errors.** Count failures and non-success responses, and check that the outputs are
  correct, not only present. A rejection is fast and a retry is slow. When the script does
  not count errors, add the count.
- **Cached or skipped work.** A warm cache on one side, a short circuit, a request deduped
  away. Run both sides as cold or as warm as production runs them.
- **Code that never ran.** Confirm the work happened inside the timed region: the rows were
  written, the bytes were read, the result was used. A generator nobody iterates, a promise
  nobody awaits and a value the compiler can discard all time nothing.
- **An untuned side.** Both sides run the way production runs them: release build, the same
  flags, versions, data and pool sizes. A side on defaults compares configurations, not code.
- **Limits it cannot break.** Do the arithmetic: bytes per second against disk and network
  bandwidth, and the time saved against the time the changed piece took. Removing a piece
  that takes 10% of the run makes the run at most about 11% faster. A result past a limit
  measured something else.
- **A piece too small to matter.** Next to a micro result, measure the path a user waits on,
  and give the micro result as its share of the whole.
- **Noise.** The alternated runs below handle it.

## Run five alternated runs per side

A is the side without the change and B the side with it. Run each side at least five times,
alternating: A, B, A, B, and so on. Alternation spreads
warmup, lazy initialization, caches and drift over both sides, so none of them favors one.
For each side, take the median and the range. The _spread_ is the wider of the two ranges.

## Give the verdict

Read the rows top to bottom. The first one that matches is the verdict.

| when                                                                                   | verdict                    |
| -------------------------------------------------------------------------------------- | -------------------------- |
| errors, cached or skipped work, or work that never ran is not ruled out                | `inconclusive`             |
| a side ran untuned, or the limiter has no evidence from a run                          | `inconclusive`             |
| the noise floor is as large as the threshold or larger                                 | `inconclusive`             |
| the medians differ by no more than the noise floor                                     | `no measurable difference` |
| the medians differ by more than the noise floor, but by no more than the spread        | `inconclusive`             |
| the medians differ by more than the spread, the ranges do not overlap, and B is better | `faster`                   |
| the medians differ by more than the spread, the ranges do not overlap, and B is worse  | `slower`                   |
| anything else                                                                          | `inconclusive`             |

A difference smaller than the spread never becomes `faster` or `slower`, however good it
looks. With `inconclusive`, name the gap: which row matched, and what would close it.

`no measurable difference` and `inconclusive` are results, and they reach the person as
they are. Give each one its runs, and never round either one up to `faster`.

## When the number proves a fix

When the number is the reproduction of a performance bug, the benchmark is the
reproduction, and it is committed with the fix. Only `faster` proves the fix. `slower` means
the fix is wrong: go back to the cause. With `no measurable difference` or `inconclusive`,
the report gives that verdict and its runs, and never calls the bug fixed.

The benchmark lives next to the code it measures (in the project's benchmark folder when one
exists) and takes the two sides as two commits: side A is the parent of the fix commit, side
B is the fix commit, each run from a temporary worktree. The profile run that names the
limiter also tests the cause: a cause whose code path the profile does not show as the
limiter is refuted.

When local runs are forbidden (`runnable: false` from `resolve_checks.py`), the same
protocol runs in CI: the noise floor runs, then the alternated runs, all on the same runner
in the same job, so the noisy neighbors of a shared runner show up in the noise floor
instead of in the result. When no workflow in `.github/workflows/` runs the benchmark,
add a job that does in its own `ci(SCOPE): ...` commit, so the person can drop it after the
proof.

## Report the number

Lead with the verdict. Then give the number with its unit, the run count per side, the
median and the range, the noise floor, and the limiter:

```
faster: p50 41 ms to 33 ms, median of 5 alternated runs per side, range 32–35 ms after,
noise floor 2 ms, bound by JSON parsing on one core
```

Keep the number, the runs, the spread and the limiter together wherever the number goes: a
PR body holds one primary number with that line, and the raw runs go in the commit or a
notes file the PR links to.
