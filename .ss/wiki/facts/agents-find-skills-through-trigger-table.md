---
type: fact
title: "Agents find situational skills through the trigger table, read first"
description: "A skill's description is not relied on to fire it; the agent's prompt opens by sending it to the table, and the skill is read by its path."
paths: ["plugins/ss/references/triggers.md", "plugins/ss/workflows/build-tasks.js", "plugins/ss/skills/orchestrate/references/briefs.md"]
sources: ["spec:situational-skills"]
status: proposed
created: 2026-11-21
updated: 2026-11-21
---

The first line of a task agent's prompt in
[build-tasks.js](/entities/module/build-tasks.md), of every orchestrate brief, and of
`/ss:diagnose`, `/ss:ship` and `/ss:correct` says to read `references/triggers.md` before
anything else. The agent loads a skill's `SKILL.md` by the path the table gives, which works
with or without the `Skill` tool.
