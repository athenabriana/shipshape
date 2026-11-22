---
type: fact
title: "A verdict's patch-id covers the code, not the run's bookkeeping"
description: "The patch-id leaves `.ss/` out, so the status flip and wiki commits after the last round keep the verdict."
paths: ["plugins/ss/scripts/patch_id.py"]
sources: ["commit:8460fc9"]
status: current
created: 2026-11-21
updated: 2026-11-21
correction: "a verdict's fingerprint covers bookkeeping written after the verdict"
---

- commit:8460fc9: [patch_id.py](/entities/module/patch-id.md) hashed the whole
  merge-base..head diff, so build's wiki pass and `status: done` flip made every verdict
  read as stale; `range_patch_id` now diffs with `:(top,exclude).ss`.
