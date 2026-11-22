---
type: fact
title: "The noise floor is measured on the unchanged side, where the real runs happen"
description: "A floor taken on one machine says nothing about a CI runner, and a difference inside the noise is never called faster."
paths: ["plugins/ss/skills/explain-the-number/SKILL.md"]
sources: ["spec:situational-skills", "commit:c5fdc9e"]
status: current
created: 2026-11-21
updated: 2026-11-21
---

`explain-the-number` takes the noise floor as the range of five runs of side A, in the
environment the real runs use; with `runnable` false, CI runs the floor and the alternated
runs on the same runner, in the same job. The spread is the wider of the two sides' ranges.
The verdict table is read top down and the first matching row wins: unexplained errors,
cached or skipped work, an untuned side, a limiter with no run behind it, or a floor at or
above the threshold give `inconclusive`; medians within the floor give
`no measurable difference`; `faster` or `slower` need the difference to exceed the spread
with ranges that do not overlap; anything else is `inconclusive`.
