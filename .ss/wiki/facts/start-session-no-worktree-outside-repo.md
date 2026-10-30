---
type: fact
title: "start_session makes no worktree outside a git repo"
description: "From a parent folder of several repos the front lands in the shared folder."
paths: ["plugins/ss/skills/orchestrate/references/briefs.md"]
sources: ["spec:orchestrate-entry"]
status: current
created: 2026-10-29
updated: 2026-10-29
---

`use_worktree: true` is ignored when the session's folder is not a git repository, so a
code front creates its own worktree before touching a file.
