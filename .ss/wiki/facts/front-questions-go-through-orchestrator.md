---
type: fact
title: "A front's questions go through the orchestrator"
description: "AskUserQuestion in a side session opens a dialog nobody watches."
paths: ["plugins/ss/skills/**", "plugins/ss/references/**", "plugins/ss/hooks/**"]
sources: ["spec:orchestrate-entry"]
status: proposed
created: 2026-10-29
updated: 2026-10-29
---

The person talks only to the orchestrator, so a skill running in a front sends each
question, its options and the recommended pick by `SendMessage` and waits. Outside a
front the skill asks the person directly.
