---
type: fact
title: "Of the situational skills, only correct shows in the slash menu"
description: "The others are for agents mid-task; the person drives from orchestrate and has no reason to call them."
paths: ["plugins/ss/skills/correct/SKILL.md", "plugins/ss/references/triggers.md"]
sources: ["spec:situational-skills"]
status: proposed
created: 2026-11-21
updated: 2026-11-21
---

Situational skills stay out of the slash menu and stay loadable by an agent: the flag that
hides a skill from the person is not the one that blocks the model. `correct` is also the
command `/ss:correct`, because the person can ask for a correction to be encoded.
