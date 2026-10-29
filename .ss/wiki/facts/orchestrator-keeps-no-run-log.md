---
type: fact
title: "The orchestrator keeps no run log"
description: "A new orchestrator rebuilds the state from list_sessions and the open PRs."
paths: ["plugins/ss/skills/orchestrate/**"]
sources: ["spec:orchestrate-entry"]
status: proposed
created: 2026-10-29
updated: 2026-10-29
---

No state file to keep in sync. The person's decisions that only lived in the old
conversation are lost on a handover; a log is the revisit if that bites.
