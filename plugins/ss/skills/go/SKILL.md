---
name: go
description: Ship Shape's router, one door for engineering work, sized to its risk. Runs on any non trivial request and stays on until you turn it off; solves picking the right recipe and the right amount of process. Matches the request to one playbook (investigate, bug-fix, review, ui-critique, iterate, ship, babysit, review-setup, learn), sizes the route (lightweight, standard or intensive) with scripts/route.py from five risk facts, and outputs the playbook's steps in the todo list, each run by its skill, with clarify's goals first and the goal loop last on the standard and intensive routes. Offers /ss:learn when the same correction lands twice. Use when the user types /ss:go, says "use ss", "be rigorous", "do this properly", "fix it and ship it", "fix and babysit", "iterate on this", "until parity", or starts any non trivial engineering task. Don't use it for a tiny mechanical change (just do it) or a question about Claude Code itself.
license: MIT
metadata:
  author: Athena Briana - github.com/athenabriana
  version: 1.7.0
---

# Go

One entry point. Match the request to a playbook, size the route, run the steps.

A **playbook** is a recipe file under `playbooks/`, with three parts: the **steps** (each
naming the skill it calls), the **route** (what lightweight, standard and intensive add or
drop) and the **endpoint** (local commit, pushed branch or open PR). The skills keep their
own entry points (`/ss:review`, `/ss:ship`, `/ss:babysit`, ...); a playbook named after a
skill is the thin recipe around it. Every playbook has a skill of its own, so its trigger
phrases reach the agent: `/ss:bug-fix` and `/ss:learn` open their playbook here, which
stays the only source of the steps.

## 1. Match a playbook

| playbook       | Pick it when                                                                                         | Read                        |
| -------------- | ---------------------------------------------------------------------------------------------------- | --------------------------- |
| `investigate`  | a read only question about the code, a branch or its history: how, why, where, what changed          | `playbooks/investigate.md`  |
| `bug-fix`      | a defect, an error, a stack trace, "this fails", "fix this bug"                                      | `playbooks/bug-fix.md`      |
| `review`       | judge a diff: the current branch, or a PR by number; "what could break" runs its `edges` front       | `playbooks/review.md`       |
| `ui-critique`  | judge a screen, not a diff: a page, an app, a mockup or a folder of UI; "critique this screen", a11y | `playbooks/ui-critique.md`  |
| `iterate`      | improve what exists until a bar is met: "until parity", "until it passes", "until it's fast enough"  | `playbooks/iterate.md`      |
| `ship`         | land a branch: commit, push, open or finish a PR, green CI                                           | `playbooks/ship.md`         |
| `babysit`      | "babysit PR 42", "watch PR 42", "fica de olho no PR 42": a watcher on any PR, by number              | `playbooks/babysit.md`      |
| `review-setup` | write or update the repo's `CODE_REVIEW_GUIDE.md`: "set up code review", "the review guide is stale" | `playbooks/review-setup.md` |
| `learn`        | a lesson to keep: "remember this", "make this mistake impossible", "record this fact"                | `playbooks/learn.md`        |

Read the matched playbook whole before the first step.

- **Two fit:** ask through the question tool which one, recommended pick first.
- **A whole flow** ("fix it and ship it") is one playbook with its scope set: run bug-fix,
  then ship, without asking again between them.
- **None fits:** say which playbook is closest and why it falls short, then do the work by
  hand under the hard rules of the operating frame. A PR somebody else opened is
  `/ss:caretake`'s. A feature or a refactor has no playbook yet: a feature runs as `/ss:clarify`, the work and the goal loop, then `/ss:ship`, or as briefs
  from `/ss:orchestrate`.
- **Before coding anything non trivial**, `/ss:clarify` maps the behavior, edges included,
  and turns the request into WHEN/THEN goals. Offer it when the expected behavior is not
  written down yet.

## 2. Size the route

A playbook that changes code records five facts before the first edit:

- **blast radius:** low, medium or high. Who calls this, and how far does a mistake travel?
- **reversible:** yes or no. A migration, a sent message or a deleted record is no.
- **data or auth:** does it touch stored data, permissions or secrets?
- **coverage:** good, some or none. Are there tests near the code that changes?
- **files:** how many files the change will likely touch.

Then run:

```bash
python3 <plugin-root>/scripts/route.py --blast-radius <low|medium|high> --reversible <yes|no> \
  --data-or-auth <yes|no> --coverage <good|some|none> --files <n>
```

It prints one line, `<route>: <reason>`. The same facts give the same route on every run.

| Route       | What runs                                                                                                                                                          |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| lightweight | preservation check, mechanical gate, the review loop with only the correctness front, then `/ss:ship`                                                              |
| standard    | the map and the goals, approved once; mechanical gate, `/ss:review` in its default loop until every goal is achieved, then `/ss:ship`                              |
| intensive   | the map and the goals, approved once; a blast radius pass over the callers, `/ss:review deep` with its `edges` front until every goal is achieved, then `/ss:ship` |

Read `references/route.md` once the route is known, before the first edit: it holds the
review gate, the goals and the goal loop, the overrides and the mechanical gate.

- **Open PR endpoint:** a PR never goes up for merge without the `/ss:review` loop on its
  latest head, once CI is green (`<plugin-root>/references/review-gate.md`).
- **Standard and intensive:** `/ss:clarify`'s goals first, the goal loop last, by
  `<plugin-root>/references/goal-loop.md`. The lightweight route has no goals.
- **Overrides:** the playbook's `## Route` section wins where it differs, and "keep it
  light" or "be thorough" from the person overrides the script. Say the route and why in
  one line.
- **Mechanical gate:** the project's checks before any review front. Push only when the
  endpoint or the playbook's scope allows it.

## 3. Run it

Read `references/run.md` before the first step: it holds each rule below in full.

- **Todo list.** The playbook's steps, word for word, ticked only with their evidence.
- **Ask once, then run long.** One decision sheet before the first step, endpoint included,
  then every step to the endpoint without asking, except on a real blocker
  (`<plugin-root>/references/long-run.md`).
- **Interface work runs on real visuals**, through the design-review loop of
  `<plugin-root>/references/design-loop.md`.
- **Preservation check before every commit.** Reread the staged diff: nothing unrelated
  changed, nothing removed the task did not ask to remove.
- **Subagents** get standalone briefs and return their questions to you.
- **In a work session**, the question tool is the orchestrator. A work session never
  starts sessions.
- **Show it before asking for a review**, by `<plugin-root>/references/show-for-review.md`.
  Only `/ss:clarify` creates a Claude Docs doc.
- **After a compaction**, reread the todo list and the brief, and pick up at the first
  unticked step.

## 4. Watch for a repeated correction

When the same class of correction lands a second time in one session, offer the `learn`
playbook through the question tool, once per class, after the current step finishes. Read
`references/repeated-correction.md` before asking: it says what a correction and its class
are, how the question reads, and what follows a yes, a no, or a work session.

Nothing about a correction runs unasked: the router offers, the person decides.

## 5. Close

Say what changed, what is verified and by what evidence, the `Goals:` line on the standard
and intensive routes, what is left, where the run stopped and why, and the choices made
without asking. When the run
learned a project fact that passes the filter in `<plugin-root>/references/project-facts.md`,
offer the `learn` playbook with the exact line. End at the handoff gate
(`<plugin-root>/references/handoff-gate.md`): the next step as a question, "stop here" always
among the options, unless the scope was authorized up front.

The router stays on for later turns. It applies when a playbook matches and keeps out of the
way otherwise. The person turns it off by saying so.
