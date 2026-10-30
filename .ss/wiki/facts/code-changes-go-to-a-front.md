---
type: fact
title: "Every code change goes to a front"
description: "The orchestrator answers reads in place and never writes code, even one line."
paths: ["plugins/ss/skills/orchestrate/**"]
sources: ["spec:orchestrate-entry"]
status: current
created: 2026-10-29
updated: 2026-10-29
---

Keeping code out of the orchestrator keeps its context on the project across a long run.
The cost, a session start per small change, was accepted for that.
