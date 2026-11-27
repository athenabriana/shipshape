# Benchmark

The bar is a number: latency, throughput, memory, startup time, bundle size, query time,
token cost. This page says how to measure it so the number holds. Read
`references/judges.md` first for what every check shares, and run `explain-the-number`
(`<plugin-root>/references/triggers.md`) before trusting the first measurement.

## 1. Pin what is measured

- **The metric and its statistic**: p50, p95 or p99 for a latency, the mean with its spread
  for a throughput, the peak for memory, bytes for a size. The bar names the statistic:
  "p95 under 200 ms", never "faster".
- **The workload**: the exact input, its size and its mix, written to `tools/` and fixed.
  A workload that is not like real use is named so in the sheet.
- **The environment**: the machine, the build mode (release, not debug), the data set, what
  else runs. The same environment every round; say it in the report.

## 2. Build the runner

- **Warmup** runs that are thrown away (caches, JIT, connection pools).
- **Repeats**: enough runs that the spread is small next to the gap to the bar; at least 10
  for a timing, and the count goes in the sheet with the goals.
- **Each run's raw value kept** in `rounds/r<N>/`, not only the summary, so the judge can
  see the spread and the outliers.
- **One command** that runs warmup, repeats and the summary, and prints the statistic the
  bar names next to the spread.

A size or a count that does not vary (bundle bytes, query count) needs one run.

## 3. Read a change

- **Against the baseline**, from `rounds/r0/`, run in the same environment.
- **A gain inside the spread is not a gain.** When the before and after overlap, run more
  repeats before calling it.
- **Re-run the baseline** when the environment may have drifted (a new machine, a
  dependency bump), and say so in the round's line.

## 4. Guard the rest

A number reached by breaking behavior is not reached. Every benchmark goal sits beside the
target's own tests (run each round) or a parity goal, so the judge can see that the faster
code still does the same work. A cache that serves the benchmark's fixed input and nothing
else is a finding at level `bloqueante`.

## The goals it checks

- `WHEN the runner replays the workload 30 times after 5 warmups THEN p95 is under 200 ms`.
- `WHEN the bundle is built in release mode THEN main.js is under 250 KB`.
- Each with the tests or the parity goal that keeps the behavior.
