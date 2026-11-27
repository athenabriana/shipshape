# Curate, resolve, apply: steps 5 to 7

Steps 5, 6 and 7 of `/ss:review` read this: the manual curation question, the resolve pass over satisfied threads, and applying what was picked.

## Step 5: Curate (the user picks)

Show the report before this question, by `<plugin-root>/references/show-for-review.md`: the
findings as an inline visual grouped by front and level (an Artifact page when they are too many to show inline), and each
proposed fix as its code before and after. Then one `AskUserQuestion` (`multiSelect`):
which numbered items to handle now,
and **how**. Fixing is one outcome, leaving the finding on the PR is another.
Options group naturally ("Todo Bloqueante", "Every correctness item",
"Only the threads", specific numbers via "Other"). "Comment the items on the PR
instead of fixing" is offered when the probe found an open PR, and fix and comment
can both be picked: fix 1–3, comment 4–6. "None, stop here" is always an option.

## Step 6: Resolve the threads the code already satisfies

Its own step because it is the one thing here curation does not gate: it runs whether the
user picked anything or nothing. A `satisfied` row from the `threads` front
(`references/front-threads.md`, "Resolve what the current code satisfies") is not a decision,
it is a thread the branch already answers in code, so it gets its reply and its resolve here,
whoever opened it. ss's own thread, the author's, another reviewer's, all the same. A thread
that was only answered stays open for its opener, and one waiting on a pick closes at step 7
with the sha of its fix.

Say in one line what the pass resolved, count and locations, zero included, and nothing goes
to GitHub to announce a zero. With the `threads` front unpicked or unavailable (no open PR,
`gh` unauthenticated) no thread was read, and the line says the pass had nothing to run.

## Step 7: Apply what was picked

Follow `references/act-apply-fixes.md`: one change at a time, justified, with the
regression guard; quality edits are strictly behavior-preserving. Then:

- **fix-threads**: commit (conventional style, no AI attribution), push to the PR
  branch, reply with the sha and resolve (`references/front-threads.md`, handling
  table).
- **answer-threads**: reply, do NOT resolve. The reviewer closes it.
- **CI fixes**: push and re-check the failing workflow; cap at 3 fix cycles, then
  report what's still red instead of thrashing.
- **comment-on-PR**: `references/act-comment-findings.md`, body shown before
  anything is posted, anchored inline where the location is in the diff and folded
  into one summary comment where it isn't. Additive against the whole conversation,
  whoever wrote it: an item marked `[já dito]` posts nothing, one partly said posts
  only its new part, a first-time finding posts in full, one already fixed survives as
  a count. Every picked item already said means no comment goes out and one line says
  so.

Re-report as a table: `# | item | action taken | commit/status`: `fixed`,
`commented (link)`, `já dito (link)` and `left in the report` are all valid outcomes.
