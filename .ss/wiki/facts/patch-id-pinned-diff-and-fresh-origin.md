---
type: fact
title: "The patch-id uses a pinned diff against a freshly fetched base"
description: "A verdict's patch-id is compared in another session and checkout, so neither git config nor a stale origin may move it."
paths: ["plugins/ss/scripts/patch_id.py"]
sources: ["spec:situational-skills", "commit:315817c"]
status: current
created: 2026-11-21
updated: 2026-11-21
---

[patch_id.py](/entities/module/patch-id.md) pins every diff option in `DIFF_FLAGS`, so a
user's `diff.algorithm`, prefix or rename setting cannot change the id. It hashes with
`git patch-id --verbatim`, since an indentation change is a code change in Python or YAML.
It fetches `origin <base>` before taking the merge-base: a stale `origin/<base>` would put
the base's changes in the diff and change the patch-id on every merge of the base.
