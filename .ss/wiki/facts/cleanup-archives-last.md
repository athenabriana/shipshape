---
type: fact
title: "Cleanup archives a front last"
description: "Archiving removes the front's worktree, so every cleanup step that needs the folder runs before archive_session."
paths: ["plugins/ss/skills/orchestrate/references/cleanup.md"]
sources: ["spec:orchestrate-session-naming", "commit:49ef4e4"]
status: current
created: 2026-10-29
updated: 2026-10-29
---

Stop what the front left running, move an app off its folder and close an abandoned PR
with its comment first. A follow-up on an unarchived front with no PR may find the folder
gone, so the message says its work lives on its branch or in the notes folder.
