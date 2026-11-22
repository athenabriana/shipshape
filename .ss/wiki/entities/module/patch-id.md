---
type: entity
kind: module
title: "patch_id.py"
description: "The script that computes a branch's patch-id and compares it with the review verdict's."
---

Lives at `plugins/ss/scripts/patch_id.py`. `/ss:ship` and the orchestrator's landing call it
before trusting a review verdict.

<!-- backlinks:start -->

## Facts

- [A review verdict holds while the branch's patch-id is unchanged](/facts/review-verdict-tied-to-patch-id.md) (current)
- [A sha read from commit data is validated before git sees it](/facts/trailer-value-used-unvalidated.md) (current)
- [A verdict's patch-id covers the code, not the run's bookkeeping](/facts/fingerprint-hashes-bookkeeping.md) (current)
- [The patch-id uses a pinned diff against a freshly fetched base](/facts/patch-id-pinned-diff-and-fresh-origin.md) (current)
- [The review verdict lives in the PR description](/facts/review-verdict-lives-in-pr-description.md) (current)

<!-- backlinks:end -->
