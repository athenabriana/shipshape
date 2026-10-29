---
type: fact
title: "A red CI run proves a bug fix only when the focused test is what failed"
description: "Red on another check, or green, says nothing about the bug, so the ship stops instead of opening the PR."
paths: ["plugins/ss/skills/ship/SKILL.md"]
sources: ["spec:bug-fix-proof", "commit:95d9ee8"]
status: current
created: 2026-10-28
updated: 2026-10-29
---

On the test commit of a repro task, the ship reads the CI failure and accepts it as the red
half of the proof only when it names that task's focused test. Any other outcome is a
blocker, and the ship never force-pushes to retake it.
