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

## the three core skills

three skills do most of the work. each one runs at a different height:

- **`/ss:go` does the work in one session.** it takes one request and carries it through.
- **`/ss:orchestrate` runs one front across work sessions.** it splits a bigger goal into tasks, starts one work session per task and lands their PRs.
- **`/ss:assistant` helps you manage all your sessions.** it is your assistant: it tells you what needs you, what changed and what to look at next.

a _front_ is one stream of work an orchestrator runs, from the first request to the last merged PR. the orchestrator and the assistant write no code: every edit is a work session's.

### `/ss:go`

for most engineering work, type `/ss:go` and then your request. for example:

- `/ss:go fix the login redirect`
- `/ss:go how does the billing sync work?`
- `/ss:go babysit PR 42`

`/ss:go` does three things:

1. **picks a playbook.** a playbook is a short recipe for one kind of work: `investigate`, `bug-fix`, `review`, `ship`, `edge-cases`, `babysit`, `review-setup`, `correct` or `learn`.
2. **sizes the process to the risk.** it picks a lightweight, standard or intensive route. a small, safe change gets a light check. a change that touches data or auth, or that is hard to undo, gets a deeper review.
3. **runs the steps.** it copies the playbook's steps into the todo list and calls the skill for each step.

it stays on for the rest of the session until you turn it off. for a tiny mechanical change, skip it and just ask.

a feature with no playbook goes through three stages: **shape** (`/ss:shape` settles what to build and writes the acceptance criteria), **build** (the agent does the work, split across subagents where that helps) and **ship** (`/ss:ship` lands the branch).

### `/ss:orchestrate`

in the claude code desktop app, type `/ss:orchestrate` and describe the goal. this session becomes the orchestrator of one front: it shapes the goal with you, keeps the front's memory in a private Claude Docs doc, starts one work session per task with a brief that stands alone, and brings you every question those sessions have. you only ever talk to the orchestrator. when a PR is green, it asks, and merges when you say so.

### `/ss:assistant`

type `/ss:assistant` in its own desktop session, or ask "how are my sessions?". the assistant reads every open front and checks it against your live sessions. it leads with what needs you, or tells you nothing does, then says in a few sentences what changed and recommends one thing to look at next. it passes work to an orchestrator for you, and relays an orchestrator's question with one line of context and the options as they were sent.

the assistant and the orchestrator talk in warm first person, by `plugins/ss/references/voice.md`.

## other commands

you can call any skill directly. `/ss:go` calls most of them for you.

| command            | use it to                                                                                             |
| ------------------ | ----------------------------------------------------------------------------------------------------- |
| `/ss:shape`        | agree on what to build before coding, ending in acceptance criteria                                   |
| `/ss:bug-fix`      | take a bug from a pasted error or "fix this bug" to a proven fix, through `/ss:go`'s bug-fix playbook |
| `/ss:investigate`  | answer a question about the code, a branch or its history, without editing                            |
| `/ss:edge-cases`   | list the edge cases of a plan, or find the ones a diff misses                                         |
| `/ss:review`       | review your branch, fix what it finds and review again, up to 3 rounds                                |
| `/ss:ship`         | green the checks, commit, and push or open a PR                                                       |
| `/ss:babysit`      | watch a PR by number: answer review threads and fix red CI until it is done                           |
| `/ss:caretake`     | look after the repo: open PRs, Dependabot alerts and outdated dependencies                            |
| `/ss:takeover`     | finish or rebase a PR someone else opened, keeping their credit                                       |
| `/ss:research`     | research code, docs or visual references, checking every claim                                        |
| `/ss:write-readme` | write a README in a minimal centered header style                                                     |

## project memory

start with `/ss:learn`. the three commands below it are what `/ss:learn` calls, and you can also call one directly when you already know the layer.

| command            | use it to                                                                                                                                     |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `/ss:learn`        | keep a lesson ("remember this", "don't let this happen again") at the strongest layer that holds it: a check, a review rule or a project fact |
| `/ss:record-fact`  | save one project fact as a line in the repo's `CLAUDE.md` or `AGENTS.md`                                                                      |
| `/ss:review-setup` | write or update `CODE_REVIEW_GUIDE.md`, the rules `/ss:review` checks against                                                                 |
| `/ss:correct`      | turn a mistake that happened twice into a check, so it cannot happen a third time                                                             |

## skills the agent loads by itself

three skills are not in the menu: `prove-the-fix`, `explain-the-number` and `attack-the-premise`. an agent reads one when its trigger fires mid-task. `prove-the-fix` fires when the task fixes a bug, `explain-the-number` when the agent measures or trusts a number, and `attack-the-premise` when a second fix fails the same check as the first. the triggers are listed in `plugins/ss/references/triggers.md`.

## hard rules

- any ss session may merge a PR when you say so in its chat, under the repo's rules. it force-pushes or deploys only when you ask for it in so many words.
- before every commit, ss rereads the staged diff, so nothing unrelated changes.
- every time ss needs you to review or approve something, it shows it first: an inline visual in the chat by default, a Design canvas for an interface, a private Claude Docs doc for text to keep, an Artifact page when it is too big to show inline.
- ss suggests the next step and waits for you, unless you approved that scope up front.

## learn more

- **playbooks:** one file per playbook in `plugins/ss/skills/go/playbooks/`. each has `## Steps`, `## Route` and `## Endpoint`.
- **risk routes:** `plugins/ss/skills/go/SKILL.md`, section `2. Size the route`. `scripts/route.py` picks the route from five facts: blast radius, reversibility, data or auth, test coverage, and files touched.
- **project facts:** `plugins/ss/references/project-facts.md`. a project fact is one short line the code cannot show, kept under `## Project facts` in `CLAUDE.md`. only `/ss:record-fact` writes them, after you approve each line.
- **fronts:** `plugins/ss/references/front-doc.md` for the front's memory (a private Claude Docs doc, or a folder under `~/.ss/fronts`), and `plugins/ss/references/front-contract.md` for how a work session runs.
- **review agents:** `/ss:review` uses three read only agents in `plugins/ss/agents/`: `ss-review-finder`, `ss-review-verifier` and `ss-review-judge`. you do not call them directly.
- **writing style:** `plugins/ss/references/doc-style.md`, and `plugins/ss/references/voice.md` for how the assistant and the orchestrator talk in chat.

## develop locally

```bash
git clone https://github.com/athenabriana/shipshape.git
claude --plugin-dir ./shipshape/plugins/ss    # load the plugin from disk to test
```

the Hermes port is not on main: it lives on the [`hermes-test`](https://github.com/athenabriana/shipshape/tree/hermes-test) branch.

<sub>parts of `/ss:review` are adapted from Claude Code's `/simplify` and `/code-review` (Anthropic, Apache-2.0). individual components retain their original licenses.</sub>
