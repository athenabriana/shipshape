# Entities

## module

- [/ss:correct](/entities/module/correct.md): The situational skill that turns a repeated correction into a check, on its own branch.
- [/ss:diagnose](/entities/module/diagnose.md): The skill that takes a bug from a short report to a proven fix, with no spec.
- [/ss:review](/entities/module/review.md): The review skill: fronts, the verify pass, and the budgeted loop over the branch.
- [build-tasks.js](/entities/module/build-tasks.md): The Workflow script /ss:build dispatches one agent per task with.
- [patch_id.py](/entities/module/patch-id.md): The script that computes a branch's patch-id and compares it with the review verdict's.
- [validate_wiki.py](/entities/module/validate-wiki.md): Checks the wiki bundle against its contract.

## concept

- [Project wiki](/entities/concept/project-wiki.md): The bundle under .ss/wiki/ that holds what reading the code does not reveal.
- [Situational skills](/entities/concept/situational-skills.md): Guidance an agent loads mid-task when its situation matches a row of the trigger table.
