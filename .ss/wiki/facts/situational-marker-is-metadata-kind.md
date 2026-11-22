---
type: fact
title: "A situational skill is marked by metadata kind, not by the menu flag"
description: "The menu flag cannot mark it because correct stays in the menu; the trigger table and the skills must match both ways."
paths: ["**/validate-triggers.ts", "**/triggers.md", "**/skills/*/SKILL.md", "package.json"]
sources: ["spec:situational-skills", "commit:f691df0"]
status: current
created: 2026-11-21
updated: 2026-11-21
---

A [situational skill](/entities/concept/situational-skills.md) carries `kind: situational`
under `metadata`. `user-invocable: false` cannot be the marker, since
[/ss:correct](/entities/module/correct.md) is situational and stays in the menu.
`validate-triggers.ts` reads only the table under `## The table` in `triggers.md`, and fails
on a duplicate row, a row whose skill does not exist or lacks the marker, a row whose path is
not `<plugin-root>/skills/<name>/SKILL.md`, and a marked skill with no row. CI and the
`package.json` `validate` script both run it.
