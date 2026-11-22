---
type: fact
title: "Files with a correctness candidate go to the verifier, not the outside reviewer"
description: "The outside reviewer runs in a read only sandbox and cannot execute a trigger."
paths: ["plugins/ss/**/verify.md", "plugins/ss/**/loop-reviewer.md"]
sources: ["spec:situational-skills", "commit:25d48d1"]
status: current
created: 2026-11-21
updated: 2026-11-21
---

In the [review](/entities/module/review.md) loop, when the outside reviewer holds the seat
and `runnable` is true, the files holding a `correctness` candidate go to
`ss:ss-review-verifier` in the same round and the rest go to the outside reviewer. A
`correctness` finding the outside reviewer returns marked `not executed` goes to a verifier
for its run before its verdict stands.
