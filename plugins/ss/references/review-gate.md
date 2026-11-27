# The review gate

A PR goes up for merge only after its review loop ran on the latest head. Green CI says the
checks pass. It does not say anyone read the change. This page states the gate: what has to
be true before any ss session asks for a merge, who runs the loop, what the verdict carries,
and what happens when it is missing.

## What the gate asks

A PR may be put up for merge, in a report that calls it ready, a merge ask or a merge, only
when all of these hold:

1. **CI is green** on the head commit.
2. **The `/ss:review` loop ran on the latest head**
   (`<plugin-root>/skills/review/references/loop.md`), and its verdict line sits in the PR
   description.
3. **The verdict still covers that head**: `patch_id.py` prints `unchanged: true` when run
   as `python3 <plugin-root>/scripts/patch_id.py --pr <n>`. A merge of the base since the loop leaves it covered. Any
   new commit of the branch's own (a CI fix, a thread fix, a conflict resolution) does not.
4. **The judge closed the loop**, with verdict `clean` or `disputed`, and every goal of the
   change achieved or deferred with its ground, by
   `<plugin-root>/references/goal-loop.md`. A loop that the person's cap or the usage
   window stopped with verdict `open` passes only with every open finding listed in the
   merge ask, by its file, its line and one line of what it is, and every goal not achieved
   named with what is missing. A verdict line with `goals none` (the lightweight route with
   no goals) or with no goal status at all (a loop from before 5.13.0) is judged on its
   verdict alone. On the standard and intensive routes the loop always records its goals.
5. **On a PR that changes UI**, the design loop ran on screenshots of the built screen
   (`<plugin-root>/references/design-loop.md`, or `/ss:ui-critique` on the screen), and the
   critic was pleased and the goals achieved, or the verdicts left open are listed in the
   merge ask the same way.

A missing verdict, a stale one (`recorded: null` or `unchanged: false`), or a UI PR with no
design loop fails the gate. The PR goes back to whoever holds the branch for a review round,
and no merge ask goes out until it returns.

## Who runs the loop

The session that holds the branch runs it, after CI is green and before it reports done:

- **A work session** runs `/ss:review` on its own PR, fixes or refuses what the judge
  finds, follows CI to green again, and reports the verdict. Its brief says so
  (`<plugin-root>/skills/orchestrate/references/briefs.md`).
- **`/ss:ship`** on the PR path runs the loop once CI is green, when no verdict covers the
  head, before its handoff (`<plugin-root>/skills/ship/references/ship-pr.md`).
- **The orchestrator and `/ss:assistant`** write no code, so they never run the loop. They
  check the verdict before every merge ask and send a PR without one back to its work
  session.

## Pick the depth

Run the loop deep, with the explicit argument `/ss:review deep`, when the change touches
tokens, secrets, auth, permissions, servers or money. Run it at standard depth otherwise.
Say the depth and the reason in one line before the loop starts, as in "Depth: deep, the
change reads an auth token." or "Depth: standard, docs only."

A playbook route that narrows the loop, such as the lightweight route's correctness front
alone, meets the gate only on a change that needs standard depth. A change of one of the
deep kinds above runs `/ss:review deep` on the head before any merge ask, whatever route
built it.

## What the verdict carries

Two lines carry the verdict, and each goes in its own place:

- **The PR description holds the verdict line** the loop writes, by "The verdict line" in
  `loop.md`: `Review loop: 2 rounds, verdict clean, patch-id <patch-id>, goals 4 of 4
achieved.` It is the only line `patch_id.py` reads, so its form stays exactly as
  `loop.md` gives it, the goal status after the patch-id.
- **The report that calls the PR done holds the `Review:` line**, which never goes in the
  PR description:

```
Review: 2 rounds, verdict clean, goals 4 of 4 achieved, depth standard, 6 fixed, 2 refused, head 4f2a9c1, patch-id <patch-id>.
```

- **Rounds**: how many the loop ran, and the cap or the usage window when one stopped it.
- **Verdict**: `clean`, `disputed` or `open`, and each open or disputed finding by file and
  line.
- **Goals**: how many of the change's goals are achieved, and each one open or deferred by
  its number, as in `goals 3 of 4 achieved, G2 open (no test pins the empty case)`.
- **Depth**: `standard` or `deep`.
- **Fixed and refused**: the counts, and the ground for each refusal.
- **Head**: the short sha the last round read, after its fixes were pushed.
- **Patch-id**: from `patch_id.py`, the value the merge check compares.

On a UI PR, the report adds a `Design:` line with the design loop's last verdicts, as in
`Design: pleased, goals achieved, nothing open.` The PR description carries the same line
under the verdict line, so the orchestrator and the assistant can read it from the PR. A UI
PR with no `Design:` line in its description fails item 5 of the gate.

## The merge ask

The merge ask goes through the question tool, and the question text itself states the
verdict in plain words, with the commit it covers: "CI is green on 4f2a9c1, and the review
loop closed clean in 2 rounds on that commit with all 4 goals achieved. Want me to merge
it?" Name the fixed and
refused counts when the work session's report gave them. An `open` or `disputed` verdict
names each finding left in the question text too, by file and line, and an open goal by
its number and what is missing.
