---
type: fact
title: "Every layer a procedure offers says how it is proven"
description: "A procedure that ranks options states the proof of each one, not only of the ones a check runs."
paths: ["plugins/ss/skills/correct/SKILL.md"]
sources: ["commit:49736ba"]
status: current
created: 2026-11-21
updated: 2026-11-21
correction: "a procedure lists layers without saying how each one is proven"
---

- commit:49736ba: [`/ss:correct`](/entities/module/correct.md)'s Step 4 proved only a
  check or a fixture, while Step 3 ranks a type and the architecture above them; those two
  are now proven by the project's typecheck or build on the lines of `<sha>^`.
