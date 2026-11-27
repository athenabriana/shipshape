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
4. **The judge closed the loop**, with verdict `clean` or `disputed`. A loop that hit its
   round cap with verdict `open` passes only with every open finding listed in the merge
   ask, by its file, its line and one line of what it is.
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

Run the loop deep (`/ss:review deep`) when the change touches tokens, secrets, auth,
permissions, a server or an endpoint, or money. Run it at standard depth otherwise. Say the
depth and the reason in one line before the loop starts, as in "Depth: deep, the change
reads an auth token." or "Depth: standard, docs only."

## What the verdict carries

The loop writes its verdict line into the PR description, by "The verdict line" in
`loop.md`. The report that calls the PR done carries one line more:

```
Review: 2 rounds, verdict clean, depth standard, 6 fixed, 2 refused, head 4f2a9c1, patch-id <patch-id>.
```

- **Rounds**: how many the loop ran, and the cap when it hit one.
- **Verdict**: `clean`, `disputed` or `open`, and each open or disputed finding by file and
  line.
- **Depth**: `standard` or `deep`.
- **Fixed and refused**: the counts, and the ground for each refusal.
- **Head**: the short sha the last round read, after its fixes were pushed.
- **Patch-id**: from `patch_id.py`, the value the merge check compares.

On a UI PR, add the design loop's last verdicts: pleased, goals achieved, and what is open.

## The merge ask

The merge ask goes through the question tool, and its description states the verdict in
plain words: "CI is green on 4f2a9c1. The review loop closed clean in 2 rounds on that
commit: 6 fixed, 2 refused." An `open` or `disputed` verdict names each finding left in
that description.
