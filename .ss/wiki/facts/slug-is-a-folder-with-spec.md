---
type: fact
title: "A slug is a folder holding spec.md"
description: "research.md can sit alone in a slug folder, so every slug lister must glob for spec.md, not for folders."
paths: ["plugins/ss/references/spec-state.md", "plugins/ss/scripts/scan_specs.py"]
sources: ["spec:research-skill", "commit:f787be9"]
status: current
created: 2026-10-29
updated: 2026-10-29
---

Readers that list slugs glob `.ss/*/spec.md`. A folder that `/ss:research` created with only
`research.md` in it is not a spec and stays invisible to `scan_specs.py` and to build.
