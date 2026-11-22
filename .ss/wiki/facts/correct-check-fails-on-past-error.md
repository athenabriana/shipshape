---
type: fact
title: "A check correct adds must fail on a real past occurrence"
description: "A check that passes on the error it was written for catches nothing; it is not landed and the run goes one layer down."
paths: ["plugins/ss/skills/correct/SKILL.md"]
sources: ["spec:situational-skills", "commit:7f6e7cd"]
status: current
created: 2026-11-21
updated: 2026-11-21
---

[/ss:correct](/entities/module/correct.md) encodes a repeated correction at the highest
layer that holds it: the architecture, a type, a lint or CI check whose message says the
fix, a test, and docs last. The check is proven on `<sha>^`, the parent of the commit that
fixed a past occurrence. With `runnable` true it runs there in a worktree. With `runnable`
false, the offending lines of `<sha>^` are committed as a fixture beside the check's test,
with a test that asserts the check fails on it; CI shows that proof and the fixture stays as
regression coverage. A check that passes on the past occurrence is not landed, and the run
tries the next layer down.

Existing code that fails the check is fixed in the same branch, and the target repo's
`CLAUDE.md` table names the check in the rule's row while the rule's prose leaves. A
correction that needs judgment stays prose, with an example of the failure.
