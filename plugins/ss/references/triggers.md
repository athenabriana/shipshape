# Situational skills

A situational skill is guidance you load by yourself, mid-task, when your situation matches
its trigger. This page lists every one of them. Read it whole before anything else, then go
on with your task.

When a trigger in the table fires, read that skill's `SKILL.md` at the path its row gives,
and follow it from that point on. Reading by path works whether or not you have the `Skill`
tool. `<plugin-root>` is the folder one level above this page's own folder.

A trigger fires on something you observe while you work, so check the table again each time
your situation changes: a number was measured, a fix failed, the task turned out to fix a
bug.

## The test for a situational skill

A piece of guidance becomes a situational skill when it passes all three tests:

1. **An observable trigger.** It can be written as "when X happens", and an agent
   recognizes X on its own, mid-task: a number was measured, the same gate failed twice, the
   task fixes a bug. Guidance with no trigger is a step of a skill, not a skill.
2. **Two consumers or more.** At least two skills or agents need it. Guidance with one
   consumer stays a section of that consumer.
3. **Judgment, not procedure.** What can run the same way every time becomes a script or a
   check, not prose.

To add a skill that passes, put `kind: situational` under `metadata` in its frontmatter and
give it a row in the table below. CI fails when a skill carries that marker and has no row,
and when a row names a skill that does not carry it.

## The table

| skill                | trigger                                                     | path                                               | read by                                                                         |
| -------------------- | ----------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------- |
| `explain-the-number` | Before you measure a number, or trust, report or act on one | `<plugin-root>/skills/explain-the-number/SKILL.md` | the bug-fix playbook (`/ss:go`), a session measuring a number                   |
| `attack-the-premise` | Your second fix failed the same gate as the first           | `<plugin-root>/skills/attack-the-premise/SKILL.md` | the bug-fix playbook (`/ss:go`), the `/ss:ship` CI loop, a session fixing a bug |
| `prove-the-fix`      | Your task fixes a bug                                       | `<plugin-root>/skills/prove-the-fix/SKILL.md`      | the bug-fix playbook (`/ss:go`), a session fixing a bug                         |
