# Test reruns

The bar is a pass rate: a flaky test that must pass every time, or a suite that must stay
green under repetition, in parallel, or in a random order. This page says how to measure a
rate the judge can trust. Read `references/judges.md` first for what every check shares.

## 1. Measure the baseline rate

- **Run the test N times** on the untouched code, with N set so a rare failure shows: at
  least 50 for a test that fails "now and then", 200 or more when the person says it fails
  once a week in CI.
- **Under the conditions that make it fail**: the CI's parallelism, a random order
  (`pytest -p random_order`, `jest --randomize`, `go test -shuffle=on`), the CI's resource
  limits. A test that never fails locally is run in the conditions of the place it fails,
  said in the sheet.
- **Each run's result and its output kept** in `rounds/r0/`, the failing ones whole: the
  failures are the evidence for the cause.

The baseline rate goes in the sheet with the goal: "baseline 46 of 50; bar 200 of 200".

## 2. Find the cause, then fix it

A flaky test has a cause: shared state, an order dependence, a timing assumption, a race,
an unmocked clock or network. Read the failing outputs side by side for what differs, and
fix the cause. Run `prove-the-fix` (`<plugin-root>/references/triggers.md`): the fix is
proven when the rate goes from the baseline to the bar, under the same conditions.

## 3. What does not count

- **A retry** around the test, a longer timeout with no cause found, a `skip` or a
  quarantine. Each one hides the rate and is a finding at level `bloqueante`, unless the
  person approved it in the sheet.
- **A smaller N** than the approved one.
- **A rate measured in easier conditions** than the baseline's.

## The goals it checks

- `WHEN test_checkout_total runs 200 times with -n 8 and a random order THEN it passes 200 times`.
- `WHEN the suite runs 20 times in a random order THEN every run is green`.
