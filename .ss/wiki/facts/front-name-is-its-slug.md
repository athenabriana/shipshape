---
type: fact
title: "A front's name is its slug"
description: "The slug names a front's sidebar row, its .ss folder and the core of its branch."
paths: ["plugins/ss/skills/orchestrate/**"]
sources: ["spec:orchestrate-session-naming"]
status: current
created: 2026-10-29
updated: 2026-10-29
---

The orchestrator picks the slug when it opens a front and passes it as `name`, as `branch_name` and in the brief. The app wraps `branch_name` in the person's branch prefix and a suffix, so the slug is the core of the branch name. A slug over 24 characters is cut at the last hyphen that fits for the `name` only, because `start_session` would otherwise derive one from the title and cut it mid-word.
