---
name: bug-fix
description: Takes a bug from a short report to a proven fix, with no spec. Runs the bug-fix playbook of /ss:go under its risk route, so the cause is found, the failure reproduced, a focused test written and the smallest fix proven, then reviewed and shipped to the endpoint you name. Use when the user says "fix this bug", "debug this", "why does this fail", "this is broken", "esse bug", "corrige esse bug", pastes an error or a stack trace and asks for a fix, or types /ss:bug-fix. Don't use it for a read only question about the code (use /ss:investigate) or for a new feature (use /ss:clarify-goals).
license: MIT
metadata:
  author: Athena Briana - github.com/athenabriana
  version: 1.0.0
---

# Bug fix

This skill is the entry point for one `/ss:go` playbook. The steps live in
`<plugin-root>/skills/go/playbooks/bug-fix.md`, and that file is their only source: read it
whole before the first step, and run it as the router does.

1. **Read the router.** Read `<plugin-root>/skills/go/SKILL.md`, sections 2 to 5: how the
   route is sized, how the steps run, the repeated correction, the close.
2. **Size the route.** Record the five risk facts of the planned fix (blast radius,
   reversible, data or auth, coverage, files) and run
   `python3 <plugin-root>/scripts/route.py` with them, at the playbook's step 5. Say the
   route and its reason in one line.
3. **Run the steps.** Copy the playbook's steps into the todo list, word for word, and tick
   each one only with the evidence it asks for.
4. **Stop at the endpoint** the person named, or the one the playbook's step 2 settles.

The router stays on after this run, as `/ss:go` does.
