---
type: fact
title: "Open every file with an explicit encoding"
description: "Windows reads text as cp1252 by default, so a file opened with no encoding breaks on UTF-8 input."
paths: ["plugins/ss/scripts/*.py"]
sources: ["commit:3c4d5e6", "commit:7f8a9b0"]
status: current
correction: "file opened without an explicit encoding"
created: 2026-11-02
updated: 2026-11-09
---

The review loop asked twice for `encoding="utf-8"` on a file the scripts open: in the build
of spec `project-wiki` on [build_wiki.py](/entities/module/build-wiki.md), then in the
build of spec `wiki-match`. Two sources make it a repeated correction, the one
`/ss:correct` is due for.
