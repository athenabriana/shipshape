---
type: fact
title: "Glob matching follows git, not fnmatch"
description: "fnmatch lets * cross a slash, so src/* would also match nested files."
paths: ["plugins/ss/scripts/build_wiki.py"]
sources: ["spec:project-wiki"]
status: current
created: 2026-10-28
updated: 2026-10-28
---

[build_wiki.py](/entities/module/build-wiki.md) matches `paths` with git's pathspec
semantics: `*` stays inside one directory and `**` crosses them. It replaces
[the fnmatch fact](/facts/fnmatch-globs.md).
