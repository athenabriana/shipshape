---
name: attack-the-premise
description: Situational guidance an agent loads by itself when its second fix failed the same gate as the first, before a third attempt. Write down the premise both fixes assumed and test it directly, so the next fix rests on evidence. Read by the bug-fix playbook of /ss:go, the /ss:ship CI loop and any session fixing a bug, through references/triggers.md.
user-invocable: false
license: MIT
metadata:
  author: Athena Briana - github.com/athenabriana
  version: 1.0.2
  kind: situational
---

# Attack the premise

`<plugin-root>` is `${CLAUDE_PLUGIN_ROOT}`: use that directory wherever this skill or a page it
reads writes `<plugin-root>`.

Two fixes that failed the same gate share a premise: one thing both of them took as true. A
third fix that assumes it fails the same way. Before that third attempt, write the premise
down and test it on its own.

This skill decides what the next attempt rests on. How many attempts your run allows stays
with what runs you: the bug-fix playbook of `/ss:go`, the CI loop of `/ss:ship`, or your brief.

## Recognize the trigger

The trigger fires when both of these hold:

- **Two fixes.** Each attempt changed files to turn the gate green. A re-run with no file
  changed in between is a flake check, not a fix, and does not count.
- **The same gate.** The same check, test, CI job, reproduction or acceptance criterion failed after
  each of them.

Note how each failure looked: the assertion, the error, the number. You compare them below.

## Write the premise

Write one sentence that both fixes assumed, before you open the code again. A sentence
qualifies when, if it were false, neither fix could have worked.

The premise usually sits under the fixes, not in them. Look first at these:

- **The gate runs the code you changed.** The build output, a cache, the installed package or
  the commit CI checked out is the one you edited.
- **The failure message names the cause.** The line the error points at is where the fault
  is, not where it surfaced.
- **The environment is the one you reason about.** Versions, environment variables, the OS
  and, when local runs are forbidden, the CI runner match what you assumed.
- **The gate asserts what you think it asserts.** The test, its fixture and its expected
  value describe the behavior you set out to produce.

## Test the premise

Find one observation that comes out differently when the premise is false, and make it. The
observation tests the premise, never a new fix: print the value, read the exact log of the
failed step, run the gate on a smaller input, compare the commit the gate ran with your head.

Put the two failures side by side, and look at how they are distributed, not only at how
large they are. Which cases fail, which pass, and what the failing ones share often says more
than the size of the error.

When local runs are forbidden, read the observation from what the gate already produced: the
CI log of both failures, its environment block, the files it checked out. When the observation
needs a run you cannot make, the premise stays untested.

Write the result under the premise: it holds or it is false, with the observation as evidence.

## Decide the third attempt

Pick the case your result matches:

- **The premise is false.** Start the next fix from what the observation showed. Look for what
  the failures share that the premise did not predict. When one part always ends on the
  failing side, change what puts it there rather than adding a step that repairs it afterward.
- **The premise holds.** The fixes were wrong under a sound premise. Make the third attempt,
  and name what it changes that the first two did not.
- **The premise could not be tested.** Stop fixing. Report the premise and the observation
  that would settle it, in the report of the bug-fix playbook, or to the person in `/ss:ship` and
  any other session. In a work session of `/ss:orchestrate`, send it to
  the orchestrator, which brings it to the person.

## Report what you tested

Whatever the outcome, the report, the commit message or the blocker carries three lines: the
premise, the observation you made, and the result. The reader then sees why the third attempt
differs from the first two.
