---
type: fact
title: "The wiki has three writers, correct in its own lane"
description: "Shape proposes, build records (with a second pass after the review loop), and correct only supersedes the correction fact it encoded."
paths: ["**/wiki-state.md", "**/correct/SKILL.md", "**/build/SKILL.md", "**/build-tasks.js"]
sources: ["spec:situational-skills", "commit:7f6e7cd"]
status: current
created: 2026-11-21
updated: 2026-11-21
---

This supersedes [Task worktrees never write the wiki](/facts/worktrees-never-write-the-wiki.md)
and reverses the two-writer contract. A task agent in
[build-tasks.js](/entities/module/build-tasks.md) still writes none of the
[project wiki](/entities/concept/project-wiki.md): it records `wiki:` lines in its convention
note, and build writes the bundle in its wiki pass after the last phase lands. When a
build's scope includes the review, a second short wiki pass after the loop records the
corrections the loop applied, on the run branch. [/ss:correct](/entities/module/correct.md),
on its branch, supersedes the correction fact it encoded with a fact naming the check that
now enforces the rule, and writes nothing else.
