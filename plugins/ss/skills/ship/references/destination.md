# Settle the destination

Read by `/ss:ship` at Step 1, before taking or asking for the destination.

In a work session, any question of this skill goes through `<plugin-root>/references/front-contract.md` instead of a local dialog.

Don't ask reflexively. If the destination is already settled by signal, **take it and just state which and why**. The question is for genuine ambiguity, not a toll on every run.

**Take it without asking when:**

- a **recalled memory** or repo convention names this repo's habit (e.g. "this repo ships by direct push to main", "always via PR"),
- the destination was **decided earlier this session or on this branch**,
- the repo state is unambiguous: a PR already open for this branch → finish that PR.

**Ask one `AskUserQuestion` only when** there's no such signal, or signals conflict (per the `<plugin-root>/references/handoff-gate.md` format). Lead with the best-fit lean:

- **Open / finish the PR**: the full flow, create the PR if none exists, auto-handle review comments (reply / fix / push / resolve), follow CI until green, run the review loop on the head when no verdict covers it, then offer a watcher through `/ss:babysit`.
- **Push to a feature branch**: commit and push to a non-protected branch (the current one, or a new name you give). No PR. Reversible, so ship runs it.
- **Push to main (or another protected branch)**: ship greens the checks and commits, then **hands you the exact push command** and stops. Shipping to a protected branch stays your call (and branch protection typically enforces it server-side); ship runs it only when you say so in its chat.

The destinations are **exclusive**: one destination per run.

When the user confirms or corrects a destination that wasn't obvious, it's worth remembering as this repo's habit so future runs skip the ask.
