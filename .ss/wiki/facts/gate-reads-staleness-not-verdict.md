---
type: fact
title: "A merge gate reads what the verdict says, not only that it is fresh"
description: "An unchanged patch-id with an `open` verdict holds the merge."
paths: ["plugins/ss/skills/orchestrate/references/landing.md"]
sources: ["commit:c1ecacf"]
status: current
created: 2026-11-21
updated: 2026-11-21
correction: "a gate checks that a verdict is fresh but not what it says"
---

- commit:c1ecacf: the orchestrator's landing merged on `unchanged: true` whatever
  `recorded.verdict` said; an `open` verdict now holds the merge and goes to the person.
