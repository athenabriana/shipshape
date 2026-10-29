---
type: fact
title: "The review loop's outward record names no model"
description: "The repo's No AI attribution rule covers commits, PRs and comments, so only the round and the verdict leave the session."
paths: ["plugins/ss/skills/review/**"]
sources: ["spec:review-loop"]
status: proposed
created: 2026-10-29
updated: 2026-10-29
---

The session report of [/ss:review](/entities/module/review.md) carries the whole loop,
reviewer by name included. Commit bodies and PR text carry only the round number and the
verdict.
