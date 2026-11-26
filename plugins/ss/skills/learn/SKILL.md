---
name: learn
description: Keeps a lesson so it holds next time. Takes a correction, a rule or a fact and sends it to the strongest layer that holds it (a check through /ss:correct, else a review rule through /ss:review-setup, else a project fact through /ss:record-fact), after one question with the recommended layer first and a visual of where it would land. Use when the user says "remember this", "don't let this happen again", "add this rule", "learn from this", "lembra disso", "não deixa isso acontecer de novo", types /ss:learn, or picks it when /ss:go offers it after the same correction lands twice. Don't use it when the layer is already named (use /ss:correct, /ss:review-setup or /ss:record-fact directly) or for a one off fix (fix it where it is).
license: MIT
metadata:
  author: Athena Briana - github.com/athenabriana
  version: 1.0.0
---

# Learn

This skill is the entry point for one `/ss:go` playbook. The steps live in
`<plugin-root>/skills/go/playbooks/learn.md`, and that file is their only source: read it
whole before the first step, and run it as the router does.

1. **Read the router.** Read `<plugin-root>/skills/go/SKILL.md`, section 3, for how the
   steps run, and `<plugin-root>/references/show-for-review.md` for the visual the
   playbook's question carries.
2. **Skip the route.** The playbook sizes no route: the skill it picks carries its own
   proof and approval.
3. **Run the steps.** Copy the playbook's steps into the todo list, word for word, and tick
   each one only with the evidence it asks for.
4. **Stop at the endpoint** of the skill the person picked.
