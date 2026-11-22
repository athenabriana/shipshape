---
type: fact
title: "A reference names only the readers that point at it"
description: "A read-by list names a skill only when that skill's files send the agent to the page."
paths: ["plugins/ss/references/triggers.md"]
sources: ["commit:c8d8733"]
status: current
created: 2026-11-21
updated: 2026-11-21
correction: "a reference names a reader that never reads it"
---

- commit:c8d8733: the [trigger table](/entities/concept/situational-skills.md) listed
  `/ss:review` among the readers of `explain-the-number` and `correct`, though no review
  file points at it; the claim was dropped.
