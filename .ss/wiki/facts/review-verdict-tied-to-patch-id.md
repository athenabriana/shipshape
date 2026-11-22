---
type: fact
title: "A review verdict holds while the branch's patch-id is unchanged"
description: "Merging the base in keeps the verdict; a CI or conflict fix after the review changes the patch-id and the review reads the delta first."
paths: ["**/ship/SKILL.md", "**/landing.md", "**/review/SKILL.md", "**/patch_id.py"]
sources: ["spec:situational-skills", "commit:315817c"]
status: current
created: 2026-11-21
updated: 2026-11-21
---

The verdict carries the patch-id of the diff from the merge-base to the head, computed by
[patch_id.py](/entities/module/patch-id.md). On a different patch-id the orchestrator does
not merge until the front reviews the delta, and `/ss:ship` says in the PR that the verdict
predates the last change. A `Repro-test-commit` whose sha was rewritten is found by its
patch-id only while the old commit can still be read, locally or fetched by sha from origin;
otherwise its proof counts as missing.
