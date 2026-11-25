# The performance path

Read this when the bug is that something got slow: a latency, a throughput, a job that times
out. The reproduction is a benchmark, and the proof is a verdict, not a pass. Steps 3, 5, 6,
9 and 10 of `bug-fix` hold as written. The steps below take the place of Steps 4, 7 and 8.

A benchmark with a noise floor and alternated runs is never a cheap local run, so it runs in
CI, on one runner, in one job.

## Run the path

1. **Write the benchmark into the repo.** It is the reproduction, and it stays in the repo in
   place of the focused test, next to the code it measures (in the project's benchmark folder
   when one exists). It times the path the report names and counts errors. It takes the two
   sides as two commits and runs each from a temporary worktree, so one run measures both.
2. **Write the decision before the first run**, in the benchmark's commit message: the claim
   you expect to make, the threshold (the smallest effect that would change the decision),
   and how the noise floor gets measured.
3. **Name the limiter before the fix**, from a profile run you do not report. The limiter
   tests the hypothesis of Step 3: a hypothesis whose code path the profile does not show as
   the limiter is refuted, and goes back to Step 3.
4. **Fix it and measure.** Side A is the parent of the fix commit, and side B is the fix
   commit. Take the noise floor on A (five runs of the unchanged side, take the range), then
   five runs per side alternated A, B, A, B, and read the verdict from the table below.
   When no workflow in `.github/workflows/` runs the benchmark, add a job that does, in its
   own `ci(SCOPE): ...` commit, so the person can drop it after the proof. Push the
   benchmark, the job and the fix together (at the **Fix only** scope, ask once with
   `clarify` before the push). Follow the run with `terminal(background=true, notify=true)`
   and `gh run watch RUN_ID --exit-status`, and take the runs from its log.
5. **Act on the verdict.** The section below says what each one means.

## Rule out what else the number measures

Before you trust a number, rule out each of these with evidence from a run:

- **Errors.** A rejection is fast and a retry is slow. Count failures, and check the outputs
  are correct, not only present.
- **Cached or skipped work.** Run both sides as cold or as warm as production runs them.
- **Code that never ran.** Confirm the work happened inside the timed region.
- **An untuned side.** Both sides use the same build mode, flags, versions, data and pool
  sizes.
- **Limits it cannot break.** Removing a piece that takes 10% of the run makes the run at
  most about 11% faster. A result past a limit measured something else.

## Give the verdict

For each side, take the median and the range. The spread is the wider of the two ranges.
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

## Act on the verdict

- **`faster`:** the fix is proven. The report carries the verdict line, the runs and the
  limiter, for example `faster: p50 41 ms to 33 ms, median of 5 alternated runs per side,
range 32–35 ms after, noise floor 2 ms, bound by JSON parsing on one core`. Step 10 goes
  on as written.
- **`slower`:** the fix is wrong. Go back to Step 3 with the runs. The three-hypothesis limit
  counts this return.
- **`no measurable difference`** or **`inconclusive`:** the fix is not proven. The report
  gives the verdict with its runs, and for `inconclusive` the row that matched and what would
  close it. It never calls the bug fixed, and neither scope chains into review or ship. End
  with one `clarify` gate at either scope: lead with **Stop here**, whose description says
  the benchmark and the fix stay committed on the branch, unproven, then **Ship it
  unproven** (`ss:ship`), whose description says the PR carries the verdict and does not
  call the bug fixed.
