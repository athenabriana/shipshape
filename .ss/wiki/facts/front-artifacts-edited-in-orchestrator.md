---
type: fact
title: "A front's artifacts open and are edited in the orchestrator"
description: "The person never opens a side session, so a page a front publishes reaches them only through the orchestrator."
paths: ["plugins/ss/skills/orchestrate/**", "plugins/ss/references/front-contract.md"]
sources: ["spec:orchestrate-entry"]
status: current
created: 2026-10-29
updated: 2026-10-29
---

A front publishes each page as an Artifact and sends the URL. The orchestrator opens it with
the `Artifact` tool's `open` action in the same turn, and applies the person's edits itself,
publishing again to the same URL. An edit that needs code or the front's context goes back to
the front.
