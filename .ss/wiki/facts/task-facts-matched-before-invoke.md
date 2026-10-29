---
type: fact
title: "Task facts are matched once, before the workflow is invoked"
description: "A task's files are unknown before it runs, and a match made inside the run would change the resume cache key."
paths: ["plugins/ss/workflows/build-tasks.js", "plugins/ss/skills/build/SKILL.md"]
sources: ["spec:project-wiki", "commit:39b166f"]
status: current
created: 2026-10-28
updated: 2026-10-28
---

Build fills each task's `wiki` in `args.tasks[]` from the paths the task's line names,
once, before it invokes [build-tasks.js](/entities/module/build-tasks.md). The prompt an
agent gets is then fixed per run, so the cache keyed on `(prompt, opts)` still resumes.
