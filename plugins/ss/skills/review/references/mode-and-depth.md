# Mode and depth: how step 1 resolves the run

Step 1 of `/ss:review` reads this to pick the mode and the depth.

- **External PR** (user names a repo and/or PR number that isn't the current
  branch's): follow `references/mode-external-pr.md`, then stop. Read-only over
  that PR; posting the review requires explicit confirmation, and the review it posts is
  never an approval.
- **Direct front ask**: the user already named the front ("CI broke", "answer the
  comments", "check it followed the rules", "what could break", "edge cases",
  `/ss:review edges`): that front is the scope. Skip step
  2's question and go straight to it. Skipping the question never skips the probe:
  a front whose sources resolve there (design's) still
  gets them resolved first, because the finder's scope block carries the resolved
  sources, and an ask whose probe comes back empty gets the remedy line, not a run. A
  playbook run that restricts the fronts is not one: it runs the loop (`references/loop.md`,
  "When a playbook runs the loop").
- **A screen, not a diff**: the user named a folder, files, a URL or a running page
  instead of the branch ("accessibility audit of this page", "design review of this
  folder"). That is `/ss:ui-critique`: say so in one line and stop. An a11y or design
  ask with no target stays here, as that front over the diff.
- **Otherwise**: current branch, all fronts on the table, and the **review loop** runs
  (`references/loop.md`, which lists what sends a run to the manual flow instead:
  `/ss:review manual`, "manual review", "let me pick", or uncommitted changes in the tree).
  Read the change's goals here (`references/loop.md`, "The goals of the change"), proposing
  them once when no source has any, seat the judge once (`references/loop.md`, "The
  judge") and say in one line that it runs on Sonnet.

Then resolve the **depth**: a separate axis from the fronts and decided here, not by
the size of the diff:

- **standard**: the default, whatever the branch looks like. Three correctness
  angles, one agent per other front, no sweep, and the whole fan-out on Sonnet.
- **deep**: only when it was asked for, whether by the argument (`/ss:review deep`),
  the phrase ("review deeply", "deep review"), or the deep option picked at step 2's
  question. It runs the full angle set, the sweep pass, the larger report cap, and
  dispatches **every** finder and verifier with `model: "opus"`. The loop's judge stays on
  Sonnet at every depth (`references/loop.md`, "The judge").

Carry the resolved depth into the scope block; `fronts.md` reads it as a flag and
sizes the fan-out from it, and the report has to name which one ran.
