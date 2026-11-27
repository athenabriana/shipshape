<div align="center">

# ship shape

[![github](https://img.shields.io/badge/github-athenabriana%2Fshipshape-111111?style=flat-square&logo=github)](https://github.com/athenabriana/shipshape)

</div>

ship shape (`ss`) is a plugin for claude code. it gives the agent a set of skills for building software: plan the change, build it, review it, and land it as a branch or a pull request. you call each skill as `/ss:<name>`.

## install

add the marketplace, then install the plugin:

```bash
claude plugin marketplace add athenabriana/shipshape
claude plugin install ss@shipshape
```

the plugin turns on a `SessionStart` hook by itself. at the start of every session, the hook gives the agent a short note on how ss works and its hard rules. you do not run anything for it.

## the two core skills

two skills do most of the work. each one runs at a different height:

- **`/ss:go` does the work in one session.** it takes one request and carries it through.
- **`/ss:orchestrate` runs one front across work sessions.** it splits a bigger goal into tasks, starts one work session per task and lands their PRs.

a _front_ is one stream of work an orchestrator runs, from the first request to the last merged PR. the orchestrator writes no code: every edit is a work session's.

### `/ss:go`

for most engineering work, type `/ss:go` and then your request. for example:

- `/ss:go fix the login redirect`
- `/ss:go how does the billing sync work?`
- `/ss:go babysit PR 42`

`/ss:go` does three things:

1. **picks a playbook.** a playbook is a short recipe for one kind of work: `investigate`, `bug-fix`, `review`, `ui-critique`, `ship`, `babysit`, `review-setup` or `learn`.
2. **sizes the process to the risk.** it picks a lightweight, standard or intensive route. a small, safe change gets a light check. a change that touches data or auth, or that is hard to undo, gets a deeper review.
3. **runs the steps.** it copies the playbook's steps into the todo list and calls the skill for each step.

it stays on for the rest of the session until you turn it off. for a tiny mechanical change, skip it and just ask.

a feature with no playbook goes through three stages: **clarify** (`/ss:clarify` maps the problem and settles the goals, verifiable WHEN/THEN lines approved once), **build** (the agent does the work, split across subagents where that helps) and **ship** (`/ss:ship` lands the branch).

### `/ss:orchestrate`

in the claude code desktop app, type `/ss:orchestrate` and describe the goal. this session becomes the orchestrator of one front: it settles the goal with you, keeps the front's memory in a private Claude Docs doc, starts one work session per task with a brief that stands alone, and brings you every question those sessions have. you only ever talk to the orchestrator. when a PR is green, it asks, and merges when you say so.

the orchestrator talks in warm first person, by `plugins/ss/references/voice.md`.

## other commands

you can call any skill directly. `/ss:go` calls most of them for you.

| command           | use it to                                                                                                         |
| ----------------- | ----------------------------------------------------------------------------------------------------------------- |
| `/ss:clarify`     | define the goals before coding: verifiable WHEN/THEN lines, edges included, and what is out of scope              |
| `/ss:bug-fix`     | take a bug from a pasted error or "fix this bug" to a proven fix                                                  |
| `/ss:investigate` | answer a question about this repo, a branch, its history or your sessions, without editing                        |
| `/ss:research`    | research what is outside this repo: other code, docs or visual references, checking every claim                   |
| `/ss:review`      | review your branch against its goals, fix what it finds and review again; `/ss:review edges` for what could break |
| `/ss:ui-critique` | judge a screen on real screenshots, design and accessibility, and fix it until it holds up                        |
| `/ss:ship`        | green the checks, commit, and push or open a PR                                                                   |
| `/ss:babysit`     | watch a PR by number: answer review threads and fix red CI until it is done                                       |
| `/ss:caretake`    | look after the PRs that are not yours: triage the repo, or adopt or modernize one PR, keeping its credit          |

## project memory

`/ss:learn` keeps a lesson ("remember this", "make this mistake impossible", "record this fact") at the strongest layer that holds it: a check on its own PR, a review rule, or a project fact as one line in the repo's `CLAUDE.md` or `AGENTS.md`. a review rule goes through `/ss:review-setup`, which you can also call to write the whole guide.

| command            | use it to                                                                                    |
| ------------------ | -------------------------------------------------------------------------------------------- |
| `/ss:learn`        | keep a lesson at the strongest layer that holds it: a check, a review rule or a project fact |
| `/ss:review-setup` | write or update `CODE_REVIEW_GUIDE.md`, the rules `/ss:review` checks against                |

## optional connectors

ss works without them, and uses them when they are there.

three free sources of real ui references, with no account and no api key. ss pulls references from them before a mockup, in every design critique and in `/ss:research`, falls back to live sites in the browser without them, and offers to help set up the one that is missing.

- **inspo**: real production websites with their palette and fonts. in claude's settings, connectors, add a custom connector named `Inspo` with the url `https://inspomcp.dev/api/mcp`, or in claude code run `claude mcp add --transport http --scope user inspo https://inspomcp.dev/api/mcp`.
- **screenrove**: screens and flows of shipped web products, such as linear and stripe. in claude's settings, connectors, add a custom connector named `Screenrove` with the url `https://screenrove.com/mcp`, or in claude code run `claude mcp add --transport http --scope user screenrove https://screenrove.com/mcp`.
- **chrome devtools mcp**: its own chrome to screenshot any public page, at a desktop or a mobile size. needs node and chrome: `claude mcp add --scope user chrome-devtools -- npx -y chrome-devtools-mcp@latest --no-usage-statistics`.

## telegram companion

`companion` is a second, optional plugin in the same marketplace: a telegram bot that bridges your messages to one claude code session. it is adapted from the official telegram channel plugin (apache-2.0), so it needs no plugin from outside this repo. telegram lets one poller hold a bot at a time, so the server polls only in the session launched with `--channels plugin:companion@shipshape` (or the development flag) and stays inert in every other one.

replies render markdown on the phone, the session can send drawn diagrams as images, and voice notes arrive as text once whisper.cpp is installed. `plugins/companion/README.md` has the setup, and `plugins/companion/UPSTREAM.md` says what changed from upstream and how to pull its fixes.

## develop locally

```bash
git clone https://github.com/athenabriana/shipshape.git
claude --plugin-dir ./shipshape/plugins/ss    # load the plugin from disk to test
```

<sub>parts of `/ss:review` are adapted from Claude Code's `/simplify` and `/code-review` (Anthropic, Apache-2.0), and `companion` from the official telegram channel plugin (Anthropic, Apache-2.0). individual components retain their original licenses.</sub>
