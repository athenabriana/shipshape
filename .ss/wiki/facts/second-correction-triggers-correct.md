---
type: fact
title: "The second source on a correction fact triggers correct"
description: "A correction is one wiki fact per class of error; its second occurrence is what turns a fix into a check."
paths: ["**/wiki-state.md", "**/build/SKILL.md", "**/orchestrate/SKILL.md", "**/relay.md"]
sources: ["spec:situational-skills", "commit:7f6e7cd"]
status: current
created: 2026-11-21
updated: 2026-11-21
---

A fix someone asked for on code an agent wrote is recorded by `/ss:build` as a correction
fact named by its class; each new occurrence appends a source. On the second, a standalone
build's report proposes [/ss:correct](/entities/module/correct.md), and the orchestrator asks
the person whether to open a `correct` front. `correct` runs on its own branch, since a new
check can fail on code outside the spec that surfaced it. When the class occurs again after
`correct` superseded its fact, a new correction fact opens and the count starts over.
