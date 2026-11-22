---
type: fact
title: "A prompt rewrite keeps the status each outcome returns"
description: "Moving a rule out of a task prompt keeps the status the prompt tells the agent to return for it."
paths: ["plugins/ss/workflows/build-tasks.js"]
sources: ["commit:3600b7f"]
status: current
created: 2026-11-21
updated: 2026-11-21
correction: "a prompt rewrite drops the status an outcome returns"
---

- commit:3600b7f: moving the proof rules to `prove-the-fix` left
  [build-tasks.js](/entities/module/build-tasks.md)'s `testRun` with "Run it: it has to
  fail." and no outcome for a test that cannot fail; the `"red"` return came back.
