---
type: fact
title: "The second source on a correction fact triggers correct"
description: "A correction is one wiki fact per class of error; its second occurrence is what turns a fix into a check."
paths: ["plugins/ss/references/wiki-state.md", "plugins/ss/skills/build/SKILL.md", "plugins/ss/skills/orchestrate/SKILL.md"]
sources: ["spec:situational-skills"]
status: proposed
created: 2026-11-21
updated: 2026-11-21
---

A fix someone asked for on code an agent wrote is recorded by `/ss:build` as a correction
fact named by its class; each new occurrence appends a source. On the second, a standalone
build's report proposes `/ss:correct`, and the orchestrator asks the person whether to open a
`correct` front. `correct` runs on its own branch, since a new check can fail on code
outside the spec that surfaced it.
