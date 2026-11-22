---
type: fact
title: "The review verdict lives in the PR description"
description: "Ship and the orchestrator read the verdict from the PR alone, so the loop writes it there."
paths: ["**/review/references/loop.md", "**/ship/SKILL.md", "**/landing.md", "**/patch_id.py"]
sources: ["spec:situational-skills", "commit:315817c"]
status: current
created: 2026-11-21
updated: 2026-11-21
---

The [review](/entities/module/review.md) loop writes
`Review loop: <N> rounds, verdict <verdict>, patch-id <hex>` into the PR description with
`gh pr edit <n> --body-file -`. [patch_id.py](/entities/module/patch-id.md) takes the last
such line of the description as the recorded verdict, or the `--expect` value when no PR
holds it yet.
