---
type: fact
title: "Of the situational skills, only correct shows in the slash menu"
description: "The others are for agents mid-task; the person drives from orchestrate and has no reason to call them."
paths: ["plugins/ss/skills/*/SKILL.md", "plugins/ss/references/triggers.md"]
sources: ["spec:situational-skills", "commit:c5fdc9e", "commit:cdd40f1", "commit:7225a25"]
status: current
created: 2026-11-21
updated: 2026-11-21
---

`explain-the-number`, `attack-the-premise` and `prove-the-fix` set top-level
`user-invocable: false`, which hides a skill from the person and leaves it loadable by an
agent. `disable-model-invocation: true` is the other flag, and it would stop agents from
loading the skill, so no situational skill sets it. `correct` sets neither and is also the
command [/ss:correct](/entities/module/correct.md), because the person can ask for a
correction to be encoded. See [situational skills](/entities/concept/situational-skills.md).
