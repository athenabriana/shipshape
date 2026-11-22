---
type: fact
title: "A performance fix is proven only on a faster verdict"
description: "Inconclusive and no measurable difference reach the person as results; the diagnose report never calls the bug fixed on them."
paths: ["plugins/ss/skills/diagnose/SKILL.md", "plugins/ss/skills/explain-the-number/SKILL.md"]
sources: ["spec:situational-skills", "commit:0fed757"]
status: current
created: 2026-11-21
updated: 2026-11-21
---

In [/ss:diagnose](/entities/module/diagnose.md), the reproduction of a performance bug is a
committed benchmark run with `explain-the-number`, in place of the focused test: side A is
the parent of the fix commit, side B the fix, five alternated runs per side, median and
range, the limiter named. When local runs are forbidden the same protocol runs in CI.

The verdict is `faster`, `slower`, `no measurable difference` or `inconclusive`. On `slower`
the run goes back to the cause, and that counts toward the three hypothesis limit. On
`no measurable difference` or `inconclusive`, neither scope chains into `/ss:ship`: one
handoff gate leads with **Stop here**, then **Ship it unproven**.
