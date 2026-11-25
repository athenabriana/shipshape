# Attack the premise

Read this when your second fix failed the same check as the first, before a third attempt.
Two fixes that failed the same check share a premise: one thing both of them took as true. A
third fix that assumes it fails the same way. Write the premise down and test it on its own.

A re-run with no file changed in between is a flake check, not a fix, and does not count.

## Write the premise

Write one sentence that both fixes assumed, before you open the code again. A sentence
qualifies when, if it were false, neither fix could have worked. Look first at these:

- **The check runs the code you changed.** The build output, a cache, the installed package
  or the commit CI checked out is the one you edited.
- **The failure message names the cause.** The line the error points at is where the fault
  is, not only where it surfaced.
- **The environment is the one you reason about.** Versions, environment variables, the OS
  and the CI runner match what you assumed.
- **The check asserts what you think it asserts.** The test, its fixture and its expected
  value describe the behavior you set out to produce.

## Test the premise

Find one observation that comes out differently when the premise is false, and make it. The
observation tests the premise, never a new fix: read the exact log of the failed CI step,
compare the sha the run checked out with your head, print the value in the cheap focused
test. Put the two failures side by side and look at which cases fail and what they share.

Run nothing heavy locally. Read the observation from what CI already produced: the log of
both failures, its environment block, the files it checked out. When the observation needs a
run you cannot make, the premise stays untested.

## Decide the third attempt

- **The premise is false.** Start the next fix from what the observation showed.
- **The premise holds.** Make the third attempt, and name what it changes that the first two
  did not.
- **The premise could not be tested.** Stop fixing. Put the premise and the observation that
  would settle it in the report.

Whatever the outcome, the report or the commit message carries three lines: the premise, the
observation you made, and the result.
