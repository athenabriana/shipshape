---
type: fact
title: "A sha read from commit data is validated before git sees it"
description: "Only a hex sha of 7 to 64 characters read from a trailer is looked up or fetched."
paths: ["plugins/ss/scripts/patch_id.py"]
sources: ["commit:8460fc9"]
status: current
created: 2026-11-21
updated: 2026-11-21
correction: "a value read from commit data reaches git unvalidated"
---

- commit:8460fc9: `resolve_commit` in [patch_id.py](/entities/module/patch-id.md) matched
  any prefix and passed the trailer's value to `rev-parse` and `fetch`; it now returns
  early unless the value matches `SHA`.
