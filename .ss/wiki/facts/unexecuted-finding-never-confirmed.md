---
type: fact
title: "A correctness finding with a trigger is confirmed only by running it"
description: "When local runs are forbidden it stays PLAUSIBLE, marked not executed; nothing is pushed to CI to prove a finding."
paths: ["plugins/ss/skills/review/references/verify.md", "plugins/ss/agents/ss-review-verifier.md"]
sources: ["spec:situational-skills"]
status: proposed
created: 2026-11-21
updated: 2026-11-21
---

In [review](/entities/module/review.md), a `correctness` candidate with a concrete trigger
(a command, an input, a test) is executed by its verifier when `runnable` is true:
reproduced is CONFIRMED with the command and its output, not reproduced is REFUTED. A
PLAUSIBLE finding is still decided by the loop like a CONFIRMED one.
