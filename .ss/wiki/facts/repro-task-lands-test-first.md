---
type: fact
title: "A repro task lands as two commits, the test first"
description: "The test commit alone is what lets CI show the red half of a bug fix's proof without rewriting history."
paths:
  [
    "plugins/ss/workflows/build-tasks.js",
    "plugins/ss/skills/build/SKILL.md",
    "plugins/ss/skills/ship/SKILL.md",
  ]
sources: ["spec:bug-fix-proof", "commit:e7ea657"]
status: current
created: 2026-10-28
updated: 2026-10-29
---

A task whose `verify:` is `repro:` commits its focused test alone, then the fix with the
tick. [build-tasks.js](/entities/module/build-tasks.md) lands both in that order, and the
ship pushes the branch up to the test commit to get a red CI run when the proof could not
run locally.
