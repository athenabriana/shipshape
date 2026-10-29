---
type: fact
title: "Research never asks mid-run"
description: "Its callers are mostly agents in side sessions, where a question is a stop someone has to relay."
paths: ["plugins/ss/skills/research/SKILL.md"]
sources: ["spec:research-skill", "commit:add24e7", "commit:f787be9"]
status: current
created: 2026-10-29
updated: 2026-10-29
---

`/ss:research` runs under `/ss:shape` and inside `/ss:orchestrate` side sessions, where nobody
watches. It runs to the end within a fixed cap and writes what the cap left out into the
report's open section, so the caller decides afterwards with the report in hand.
