---
type: fact
title: "validate_wiki.py lists tracked files from the git root"
description: "Run from the bundle directory, git ls-files lists only the bundle, and every fact reads as an orphan."
paths: ["plugins/ss/scripts/validate_wiki.py"]
sources: ["spec:project-wiki", "commit:d715f76"]
status: current
created: 2026-10-28
updated: 2026-10-28
---

[validate_wiki.py](/entities/module/validate-wiki.md) resolves `git rev-parse
--show-toplevel` first and runs `git ls-files` there, because `paths` are relative to the
git root.
