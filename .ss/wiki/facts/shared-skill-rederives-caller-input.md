---
type: fact
title: "A shared skill takes what its caller already settled"
description: "A situational skill reads an input from its caller first, and resolves it itself only when no caller states it."
paths: ["plugins/ss/skills/prove-the-fix/SKILL.md"]
sources: ["commit:a188da4"]
status: current
created: 2026-11-21
updated: 2026-11-21
correction: "a shared skill re-derives what its caller already settled"
---

- commit:a188da4: `prove-the-fix` took `runnable` from `resolve_checks.py` even inside a
  build task, whose prompt already states it; it now takes the caller's first.
