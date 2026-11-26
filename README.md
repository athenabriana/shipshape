<div align="center">

# ship shape

[![github](https://img.shields.io/badge/github-athenabriana%2Fshipshape-111111?style=flat-square&logo=github)](https://github.com/athenabriana/shipshape)

_a claude code plugin of technical skills: shape → build → ship._

</div>

ship shape (`ss`) is a plugin for claude code. it gives the agent a set of skills for building software: plan the change, build it, review it, and land it as a branch or a pull request. you call each skill as `/ss:<name>`.

## install

add the marketplace, then install the plugin:

```bash
claude plugin marketplace add athenabriana/shipshape
claude plugin install ss@shipshape-skills
```

the plugin turns on a `SessionStart` hook by itself. at the start of every session, the hook gives the agent a short note on how ss works and the hard rules below. you do not run anything for it.

## start here: `/ss:go`

for most engineering work, type `/ss:go` and then your request. for example:

- `/ss:go fix the login redirect`
- `/ss:go how does the billing sync work?`
- `/ss:go babysit PR 42`

`/ss:go` does three things:

1. **picks a playbook.** a playbook is a short recipe for one kind of work: `investigate`, `bug-fix`, `review`, `ship`, `edge-cases`, `babysit`, `review-setup` or `correct`.
2. **sizes the process to the risk.** it picks a lightweight, standard or intensive route. a small, safe change gets a light check. a change that touches data or auth, or that is hard to undo, gets a deeper review.
3. **runs the steps.** it copies the playbook's steps into the todo list and calls the skill for each step.

it stays on for the rest of the session until you turn it off. for a tiny mechanical change, skip it and just ask.

## the flow for a new feature

a feature with no playbook goes through three stages:

1. **shape:** `/ss:shape` settles what to build and writes the acceptance criteria.
2. **build:** the agent does the work, split across subagents where that helps.
3. **ship:** `/ss:ship` lands the branch.

## other commands

you can call any skill directly. `/ss:go` calls most of them for you.

**everyday work**

| command            | use it to                                                                   |
| ------------------ | --------------------------------------------------------------------------- |
| `/ss:shape`        | agree on what to build before coding, ending in acceptance criteria         |
| `/ss:investigate`  | answer a question about the code, a branch or its history, without editing  |
| `/ss:edge-cases`   | list the edge cases of a plan, or find the ones a diff misses               |
| `/ss:review`       | review your branch, fix what it finds and review again, up to 3 rounds      |
| `/ss:ship`         | green the checks, commit, and push or open a PR (it never merges)           |
| `/ss:babysit`      | watch a PR by number: answer review threads and fix red CI until it is done |
| `/ss:caretake`     | look after the repo: open PRs, Dependabot alerts and outdated dependencies  |
| `/ss:takeover`     | finish or rebase a PR someone else opened, keeping their credit             |
| `/ss:research`     | research code, docs or visual references, checking every claim              |
| `/ss:write-readme` | write a README in a minimal centered header style                           |

**running several sessions** (in the claude code desktop app)

| command           | use it to                                                                                      |
| ----------------- | ---------------------------------------------------------------------------------------------- |
| `/ss:orchestrate` | make this session the orchestrator of one front: it plans and starts one work session per task |
| `/ss:manager`     | sit above the orchestrators: see what every front is doing and pass work along                 |

a _front_ is one stream of work an orchestrator runs, from the first request to the last merged PR. the orchestrator and the manager write no code.

**project memory**

| command            | use it to                                                                         |
| ------------------ | --------------------------------------------------------------------------------- |
| `/ss:record-fact`  | save one project fact as a line in the repo's `CLAUDE.md` or `AGENTS.md`          |
| `/ss:review-setup` | write or update `CODE_REVIEW_GUIDE.md`, the rules `/ss:review` checks against     |
| `/ss:correct`      | turn a mistake that happened twice into a check, so it cannot happen a third time |

## skills the agent loads by itself

three skills are not in the menu: `prove-the-fix`, `explain-the-number` and `attack-the-premise`. an agent reads one when its trigger fires mid-task. `prove-the-fix` fires when the task fixes a bug, `explain-the-number` when the agent measures or trusts a number, and `attack-the-premise` when a second fix fails the same check as the first. the triggers are listed in `plugins/ss/references/triggers.md`.

## hard rules

- ss never merges, approves, force-pushes, pushes a protected branch or deploys. the one exception: `/ss:orchestrate` and `/ss:manager` merge a PR when you authorize it in that session's own chat, under the repo's rules.
- tests, lints, type checks and builds run in CI, not on your machine. ss pushes, follows the CI run to the end and fixes what fails.
- ss never posts to Slack or any channel unless you ask.
- before every commit, ss rereads the staged diff, so nothing unrelated changes.
- ss suggests the next step and waits for you, unless you approved that scope up front.

## learn more

- **playbooks:** one file per playbook in `plugins/ss/skills/go/playbooks/`. each has `## Steps`, `## Route` and `## Endpoint`.
- **risk routes:** `plugins/ss/skills/go/SKILL.md`, section `2. Size the route`. `scripts/route.py` picks the route from five facts: blast radius, reversibility, data or auth, test coverage, and files touched.
- **project facts:** `plugins/ss/references/project-facts.md`. a project fact is one short line the code cannot show, kept under `## Project facts` in `CLAUDE.md`. only `/ss:record-fact` writes them, after you approve each line.
- **fronts:** `plugins/ss/references/front-doc.md` for the front's memory (a private Claude Docs doc, or a folder under `~/.ss/fronts`), and `plugins/ss/references/front-contract.md` for how a work session runs.
- **review agents:** `/ss:review` uses three read only agents in `plugins/ss/agents/`: `ss-review-finder`, `ss-review-verifier` and `ss-review-judge`. you do not call them directly.
- **writing style:** `plugins/ss/references/doc-style.md`.

## develop locally

```bash
git clone https://github.com/athenabriana/shipshape.git
claude --plugin-dir ./shipshape/plugins/ss    # load the plugin from disk to test
```

the Hermes port is not on main: it lives on the [`hermes-test`](https://github.com/athenabriana/shipshape/tree/hermes-test) branch.

<sub>parts of `/ss:review` are adapted from Claude Code's `/simplify` and `/code-review` (Anthropic, Apache-2.0). individual components retain their original licenses.</sub>
