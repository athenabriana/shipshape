---
type: fact
title: "The repro proof rules live in prove-the-fix, the trailers in build-tasks.js"
description: "Build and diagnose point to one skill for the proof, so the two halves and their order are written once."
paths: ["**/prove-the-fix/SKILL.md", "**/build-tasks.js", "**/diagnose/SKILL.md"]
sources: ["spec:situational-skills", "commit:7225a25"]
status: current
created: 2026-11-21
updated: 2026-11-21
---

`prove-the-fix` holds the two halves of a fix's proof, their order, how each half is shown,
and the rule that the focused test checks behavior rather than implementation. A repro task
in [build-tasks.js](/entities/module/build-tasks.md) and
[/ss:diagnose](/entities/module/diagnose.md) send the agent to that skill. The commit
trailers have one written form, `PROOF_TRAILERS` in `build-tasks.js`, and the skill points
there instead of repeating it.
