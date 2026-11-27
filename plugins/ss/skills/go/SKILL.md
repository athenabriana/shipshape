---
name: go
description: Ship Shape's router. Matches the request to one playbook (investigate, bug-fix, review, ui-critique, ship, edge-cases, babysit, review-setup, correct, learn), sizes the route (lightweight, standard or intensive) with scripts/route.py from five risk facts, copies the playbook's steps into the todo list and runs each step's skill. Stays on until you turn it off, offers the learn playbook when the same correction lands twice, and shows a visual with every review ask. Use when the user types /ss:go, says "use ss", "be rigorous", "do this properly", "fix and babysit", "fix it and ship it", says "babysit PR 42", "critique this screen", "set up code review", "make this mistake impossible", or starts any non trivial engineering task. Don't use it for a tiny mechanical change (just do it) or for a question about Claude Code itself.
license: MIT
metadata:
  author: Athena Briana - github.com/athenabriana
  version: 1.5.0
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
| `review`       | judge a diff: the current branch, or a PR by number                                                  | `playbooks/review.md`       |
| `ui-critique`  | judge a screen, not a diff: a page, an app, a mockup or a folder of UI; "critique this screen", a11y | `playbooks/ui-critique.md`  |
| `ship`         | land a branch: commit, push, open or finish a PR, green CI                                           | `playbooks/ship.md`         |
| `edge-cases`   | "what could break", "edge cases": before coding (plan mode) or on a diff (diff mode)                 | `playbooks/edge-cases.md`   |
| `babysit`      | "babysit PR 42", "watch PR 42", "fica de olho no PR 42": a watcher on any PR, by number              | `playbooks/babysit.md`      |
| `review-setup` | write or update the repo's `CODE_REVIEW_GUIDE.md`: "set up code review", "the review guide is stale" | `playbooks/review-setup.md` |
| `correct`      | a correction that landed twice: "make this mistake impossible", "turn this into a check"             | `playbooks/correct.md`      |
| `learn`        | a lesson to keep, layer not named: "remember this", "don't let this happen again", "add this rule"   | `playbooks/learn.md`        |

Read the matched playbook whole before the first step.

- **Two fit:** ask through the question tool which one, recommended pick first.
- **A whole flow** ("fix it and ship it") is one playbook with its scope set: run bug-fix,
  then ship, without asking again between them.
- **None fits:** say which playbook is closest and why it falls short, then do the work by
  hand under the hard rules of the operating frame. A feature, a refactor or a takeover has
  no playbook yet: a feature runs as `/ss:clarify-goals`, the work and the goal loop, then `/ss:ship`, or as briefs
  from `/ss:orchestrate`.
- **Before coding anything non trivial**, `/ss:edge-cases` in plan mode turns the request
  into WHEN/THEN acceptance criteria. Offer it when the expected behavior is not written
  down yet.

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

| Route       | What runs                                                                                                                                                                 |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| lightweight | preservation check, mechanical gate, the review loop with only the correctness front, then `/ss:ship`                                                                     |
| standard    | the map and the goals, approved once; mechanical gate, `/ss:review` in its default loop until every goal is achieved, then `/ss:ship`                                     |
| intensive   | the map and the goals, approved once; a blast radius pass over the callers, `/ss:edge-cases` on the diff, `/ss:review deep` until every goal is achieved, then `/ss:ship` |

On the open PR endpoint, every route ends with the `/ss:review` loop on the PR's latest
head, once CI is green, before the handoff: a PR never goes up for merge without it
(`<plugin-root>/references/review-gate.md`). Deep depth when the change touches tokens,
secrets, auth, permissions, servers or money, standard otherwise, said in one line.

**Goals on the standard and intensive routes.** Every playbook on these routes opens with
the map and the goals and ends with the goal loop, by
`<plugin-root>/references/goal-loop.md`:

- **First**, before the first edit: run `/ss:clarify-goals`, which maps the problem and the code and
  proposes verifiable goals (numbered WHEN/THEN lines, each with its check: a test, a
  command, a screenshot or a cited source) and what is out of scope. Its blocks join the
  opening decision sheet, "Approve these goals" recommended, beside the endpoint and every
  other open question. Goals that already exist skip it, by `goal-loop.md` section 1: a
  brief that carries approved goals (a work session asks nothing about them), and a
  playbook's own goals (the bug-fix playbook's reproduction and focused test), which stand
  without a question unless the request leaves an outcome open.
- **Last**, before the endpoint: the playbook's judge (`/ss:review`'s loop, the design
  critic) checks every goal each round, with no default round limit, until every goal is
  achieved and the judge is pleased, or the usage window or the person's cap stops it. The
  close carries the `Goals:` line.

The lightweight route keeps its steps as they are, with no goals. A playbook with no route
(investigate, edge-cases, babysit, review-setup, correct, learn) runs its skill's own terms.

The playbook's own `## Route` section says how this applies to it, and wins where it differs.
"Keep it light" or "be thorough" from the person overrides the script. Say which route you
are on and why, in one line.

**Mechanical gate.** The cheap, objective checks come before any review front. The repo's
pre-commit hooks run on commit. The rest of the gate is the project's checks, which
`<plugin-root>/scripts/resolve_checks.py` names: run them locally when they are cheap and
the repo's or the machine's `CLAUDE.md` allows it, or push and let CI run them. Push only
when the endpoint or the playbook's scope allows it, then follow the run to the end with
`Bash` `run_in_background` (`gh run watch <id> --exit-status`) and fix what it surfaces. An
endpoint of "local commit" with no local run leaves the checks unrun; say so in the
close.

## 3. Run it

- **Todo list.** Copy the playbook's steps into the session's todo list, word for word, and
  tick each as it finishes. A step is done only with the evidence it asks for.
- **Ask once, then run long.** When the goal is clear, gather every open question before
  the first step and ask them together, in one decision sheet with a default on each,
  by `<plugin-root>/references/long-run.md`. The endpoint, when the person left it open,
  is one of its blocks: a local commit, a pushed branch, or an open PR. A work session
  reads the endpoint from its brief; when the brief leaves it open, it stops at a local
  commit and says so in its report. After the answers, run every step to the endpoint
  without asking: no "should I continue?", no stop between steps. Ask again only on a
  real blocker as that page defines it, and stop at a clean step when the person's cap is
  reached or the usage window runs low.
- **Interface work runs on real visuals.** A change the person sees is checked on
  screenshots of the running thing, through the browser or app tools at hand, and goes
  through the design-review loop of `<plugin-root>/references/design-loop.md` until the
  critic is pleased and the goals are achieved. Whether to start on a mockup (recommended)
  or the real screen is the person's pick, one block of the opening sheet when they have
  not said, by `<plugin-root>/references/show-for-review.md`.
- **Preservation check before every commit.** Reread the staged diff: nothing unrelated
  changed, nothing removed the task did not ask to remove.
- **Subagents.** Split independent work with `Agent` subagents, each with a standalone brief:
  goal, repo, worktree, branch, acceptance criteria, limits. They cannot ask anyone: they
  return their questions, and you ask them through the question tool, or a decision sheet
  for anything bigger than one quick pick (`<plugin-root>/references/decision-sheet.md`).
- **In a work session** (a session whose brief says an orchestrator started it), the
  question tool is the orchestrator: `SendMessage` the question with its options and your
  pick, or a decision sheet as its `ss.ask` JSON, then end the turn. A work session never starts sessions.
- **Show it before asking for a review.** Every review or approval ask comes with a visual
  built before the question, in the form `<plugin-root>/references/show-for-review.md`
  picks: an inline visual in the chat by default, else a Design canvas, a private Claude Docs doc or an Artifact page.
- **After a compaction**, reread the todo list, and the brief if there is one, and pick up at
  the first unticked step.

## 4. Watch for a repeated correction

A **correction** is a fix the person asks for on work an agent did here: "no, use X",
"that's wrong, do Y", an edit they undo. Its **class** names the mistake, so a second
occurrence reads as the same one. While the router is on, keep the classes of this
session's corrections in mind.

When the same class lands a second time in one session, ask through the question tool
whether to run the `learn` playbook on it, which picks the layer that holds it: a check
(`/ss:correct`), a review rule (`/ss:review-setup`) or a project fact (`/ss:record-fact`).
The question names the class and both occurrences; "Learn it" is the recommended pick,
and "Not now" the other option. Ask once per class, after the current step finishes, and
go on with the task either way.

- **On a yes**, run the `learn` playbook once the current task reaches its endpoint or the
  person says to switch. A check it picks lands on its own branch from the base, never on
  the branch of the task that surfaced it.
- **On a no**, drop the class for the rest of the session.
- **In a work session**, the question goes to the orchestrator like any other, as a
  `Correction repeated:` line naming the class and its occurrences.

Nothing about a correction runs unasked: the router offers, the person decides.

## 5. Close

Say what changed, what is verified and by what evidence, the `Goals:` line on the standard
and intensive routes, what is left, where the run stopped and why, and the choices made
without asking. When the run
learned a project fact that passes the filter in `<plugin-root>/references/project-facts.md`,
offer `/ss:record-fact` with the exact line, or the `learn` playbook when the layer is not
clear. End at the handoff gate
(`<plugin-root>/references/handoff-gate.md`): the next step as a question, "stop here" always
among the options, unless the scope was authorized up front.

The router stays on for later turns. It applies when a playbook matches and keeps out of the
way otherwise. The person turns it off by saying so.
