---
type: fact
title: "A correction fact's sources count its occurrences"
description: "Only commit and pr sources are allowed, so the number of sources is the number of times the error happened."
paths: ["**/wiki-state.md", "**/validate_wiki.py", "**/correct/SKILL.md"]
sources: ["spec:situational-skills", "commit:7f6e7cd"]
status: current
created: 2026-11-21
updated: 2026-11-21
---

A correction fact lists only `commit:` and `pr:` sources, each one occurrence; the spec that
surfaced it is named in the body, since a `spec:` source would be counted as an occurrence.
[validate_wiki.py](/entities/module/validate-wiki.md) rejects a correction fact that is
`proposed` or lists a source twice, and lists each current correction fact with two sources
or more as a repeated correction for [/ss:correct](/entities/module/correct.md).
