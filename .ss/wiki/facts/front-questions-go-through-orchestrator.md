---
type: fact
title: "A front's questions go through the orchestrator"
description: "AskUserQuestion in a side session opens a dialog nobody watches."
paths:
  [
    "plugins/ss/skills/orchestrate/**",
    "plugins/ss/skills/shape/SKILL.md",
    "plugins/ss/skills/build/SKILL.md",
    "plugins/ss/skills/review/SKILL.md",
    "plugins/ss/skills/ship/SKILL.md",
    "plugins/ss/references/handoff-gate.md",
    "plugins/ss/hooks/operating-context.md",
  ]
sources: ["spec:orchestrate-entry"]
status: proposed
created: 2026-10-29
updated: 2026-10-29
---

The person talks only to the orchestrator, so a skill running in a front sends each
question, its options and the recommended pick by `SendMessage` and waits. Outside a
front the skill asks the person directly.
