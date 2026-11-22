---
type: fact
title: "Build passes the plugin root into every task prompt"
description: "A task agent reads the trigger table and the skills by absolute path, and the root is part of the task cache key."
paths: ["**/build-tasks.js", "**/build-tasks-workflow.md", "**/build/SKILL.md"]
sources: ["spec:situational-skills", "commit:69695c3", "commit:2d5a2ee"]
status: current
created: 2026-11-21
updated: 2026-11-21
---

`/ss:build` passes `pluginRoot` to [build-tasks.js](/entities/module/build-tasks.md), which
writes it into each task prompt's paths to `references/triggers.md` and the situational
skills; without it the prompt keeps the `<plugin-root>` placeholder. The root is part of
the cache key, so after a plugin upgrade the unticked tasks rebuild and the ticked ones
come back skipped.
