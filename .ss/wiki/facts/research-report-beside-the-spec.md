---
type: fact
title: "The research report lives beside the spec, uncommitted by research"
description: "research.md must outlive the side session that wrote it, and only shape knows which branch it belongs to."
paths: ["plugins/ss/skills/research/SKILL.md", "plugins/ss/skills/shape/SKILL.md", "plugins/ss/references/spec-state.md"]
sources: ["spec:research-skill"]
status: proposed
created: 2026-10-29
updated: 2026-10-29
---

`/ss:research` always writes `.ss/<slug>/research.md`, so a report made in a side session
survives the session being archived and a later shape on the same slug reads it instead of
rerunning. Research never commits it: shape commits it with the spec, and a standalone
caller decides.
