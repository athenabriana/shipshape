---
type: fact
title: "The review loop's reviewer is another model when one is installed"
description: "Different models find different problems, so the loop prefers an outside reviewer over ss's own verifier."
paths: ["plugins/ss/skills/review/**"]
sources: ["spec:review-loop"]
status: proposed
created: 2026-10-29
updated: 2026-10-29
---

The loop in [/ss:review](/entities/module/review.md) seats an outside reviewer (Codex CLI
today) in the verifier's place when it is on `PATH`, and falls back to
`ss-review-verifier` when none is installed or it fails in a round.
