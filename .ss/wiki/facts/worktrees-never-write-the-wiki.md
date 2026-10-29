---
type: fact
title: "Task worktrees never write the wiki"
description: "Parallel tasks of one phase would collide on the derived files when they land."
paths: ["plugins/ss/workflows/build-tasks.js", "plugins/ss/skills/build/SKILL.md"]
sources: ["spec:project-wiki", "commit:39b166f"]
status: current
created: 2026-10-28
updated: 2026-10-28
---

A task agent in [build-tasks.js](/entities/module/build-tasks.md) records what it learned
as `wiki:` lines in its convention note, kept whole when the note condenses. Build writes
the bundle once, in its wiki pass after the last phase lands.
