---
type: fact
title: "A check correct adds must fail on a real past occurrence"
description: "A check that passes on the error it was written for catches nothing; it is not landed and the report says so."
paths: ["plugins/ss/skills/correct/SKILL.md"]
sources: ["spec:situational-skills"]
status: proposed
created: 2026-11-21
updated: 2026-11-21
---

`/ss:correct` encodes a repeated correction at the highest layer that holds it: the
architecture, a type, a lint or CI check whose message says the fix, a test, and docs last.
The check runs against the commit of a past occurrence first. Existing code that fails it is
fixed in the same branch, and the target repo's `CLAUDE.md` table names the check in the
rule's row while the rule's prose leaves. A correction that needs judgment stays prose, with
an example of the failure.
