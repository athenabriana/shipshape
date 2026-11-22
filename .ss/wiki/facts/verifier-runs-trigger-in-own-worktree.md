---
type: fact
title: "The review verifier runs a trigger only in a disposable worktree at head"
description: "The run never touches the working tree; past 120 seconds, or with runnable false, the finding stays PLAUSIBLE, not executed."
paths: ["plugins/ss/skills/review/references/verify.md", "plugins/ss/agents/ss-review-verifier.md"]
sources: ["spec:situational-skills", "commit:25d48d1"]
status: current
created: 2026-11-21
updated: 2026-11-21
---

In [review](/entities/module/review.md), the verifier's execution lane opens a detached
worktree at `head` with `git worktree add --detach`, applies the uncommitted edits into it,
installs nothing, runs the trigger and removes the worktree. A run that cannot start or end
within 120 seconds is PLAUSIBLE, `not executed`. With `runnable` false or absent, the finding
is PLAUSIBLE, `not executed`, with the command that would have run. External PR mode is
`runnable: false`.
