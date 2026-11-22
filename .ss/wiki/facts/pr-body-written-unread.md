---
type: fact
title: "A PR description is read before a line of it is replaced"
description: "Writing one line into a PR description reads the whole body first and writes the whole body back."
paths: ["plugins/ss/skills/review/references/loop.md"]
sources: ["commit:8460fc9"]
status: current
created: 2026-11-21
updated: 2026-11-21
correction: "a PR description is written back without being read first"
---

- commit:8460fc9: the [review loop](/entities/module/review.md)'s step 4 piped the verdict
  line to `gh pr edit --body-file -` with no read, which could replace the description
  with that line alone; it now reads the body with `gh pr view --json body` first.
