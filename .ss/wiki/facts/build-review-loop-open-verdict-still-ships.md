---
type: fact
title: "A build whose review loop ends open still ships, flagged"
description: "A known Bloqueante is settled on the PR, where a human sees it; stalling the run on a possibly wrong finding costs more."
paths: ["plugins/ss/skills/build/**", "plugins/ss/skills/review/references/loop.md"]
sources: ["spec:build-review-loop"]
status: proposed
created: 2026-10-29
updated: 2026-10-29
---

When the review loop of [/ss:review](/entities/module/review.md), run by `/ss:build`, spends
its budget with a Bloqueante open, the ship still runs. The PR description lists each open
Bloqueante and each disputed refusal and says the PR is not ready to merge until they are
settled.
