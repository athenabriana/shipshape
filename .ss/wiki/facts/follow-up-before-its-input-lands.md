---
type: fact
title: "A follow-up branched from the base waits for its input to land"
description: "A run that branches from the base starts only once the PR carrying what it reads has landed there."
paths: ["plugins/ss/skills/correct/**", "plugins/ss/skills/**/relay.md"]
sources: ["commit:490439d"]
status: current
created: 2026-11-21
updated: 2026-11-21
correction: "a follow-up run starts before the PR carrying its input lands"
---

- commit:490439d: [`/ss:correct`](/entities/module/correct.md) branches from the base and
  reads the correction fact, which lives only on the run's branch until its PR lands; the
  run, the relay and the build report (637f0fd, same occurrence) now wait for that landing.
