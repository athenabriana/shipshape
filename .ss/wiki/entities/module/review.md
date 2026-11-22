---
type: entity
kind: module
title: "/ss:review"
description: "The review skill: fronts, the verify pass, and the budgeted loop over the branch."
---

Reviews the branch's diff through read only finders and an independent reviewer, then fixes
or refuses what they verified, round after round.

<!-- backlinks:start -->

## Facts

- [A build whose review loop ends open still ships, flagged](/facts/build-review-loop-open-verdict-still-ships.md) (current)
- [A correctness finding with a trigger is confirmed only by running it](/facts/unexecuted-finding-never-confirmed.md) (current)
- [Files with a correctness candidate go to the verifier, not the outside reviewer](/facts/correctness-files-stay-with-verifier.md) (current)
- [The review verdict lives in the PR description](/facts/review-verdict-lives-in-pr-description.md) (current)
- [The review verifier runs a trigger only in a disposable worktree at head](/facts/verifier-runs-trigger-in-own-worktree.md) (current)
- [The review loop's outward record names no model](/facts/review-loop-record-names-no-model.md) (proposed)
- [The review loop's reviewer is another model when one is installed](/facts/review-loop-reviewer-is-another-model.md) (proposed)

<!-- backlinks:end -->
