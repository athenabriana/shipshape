<div align="center">

# ship shape

[![github](https://img.shields.io/badge/github-athenabriana%2Fshipshape-111111?style=flat-square&logo=github)](https://github.com/athenabriana/shipshape)

_a claude code plugin of technical skills: shape → build → ship._

</div>

add the marketplace, then install the one plugin:

```bash
claude plugin marketplace add athenabriana/shipshape
claude plugin install ss@shipshape-skills
```

it ships a `SessionStart` operating-context hook, auto-active on install. skills are invoked as `/ss:<skill>`, e.g. `/ss:go`, `/ss:shape`, `/ss:ship`, `/ss:review`.

## what's inside

one plugin, `ss`; the skills are organized by use.

### the router

`/ss:go` reads the request, matches it to a **playbook** (a short recipe under `plugins/ss/skills/go/playbooks/`) and sizes the process to the risk: `scripts/route.py` picks a lightweight, standard or intensive route from five facts (blast radius, reversibility, data or auth, test coverage, files touched). the playbook's steps go into the todo list, each calling a skill.

| playbook      | what it runs                                                                                                       |
| ------------- | ------------------------------------------------------------------------------------------------------------------ |
| `investigate` | `/ss:investigate`, read only                                                                                       |
| `bug-fix`     | find the cause, reproduce it, size the route, the smallest fix and its proof, the mechanical gate, review and ship |
| `review`      | `/ss:review`, deep on the intensive route                                                                          |
| `ship`        | `/ss:ship`, then offers `/ss:babysit`                                                                              |
| `edge-cases`  | `/ss:edge-cases` in plan or diff mode                                                                              |
| `babysit`     | `/ss:babysit` on any PR by number                                                                                  |

### shape → build → ship

shape settles the acceptance criteria, the build is the work itself (split across subagents where it pays), and ship lands the branch.

| skill             | description                                                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `/ss:shape`       | align on the idea before building: draft, loop on the gray areas through questions, map behavior, write the acceptance criteria |
| `/ss:edge-cases`  | plan mode writes WHEN/THEN acceptance criteria before coding; diff mode finds and proves the cases a change misses              |
| `/ss:ship`        | land the branch your way: green the checks, then push to a branch, prep a push to main, or open a PR and green it               |
| `/ss:babysit`     | watch any PR by number until it is merged, closed, or approved with CI green: answer threads, fix red CI (never merges)         |
| `/ss:record-fact` | propose one project fact as an exact line, and write it to the repo's `CLAUDE.md` or `AGENTS.md` once you approve it            |

project facts replace the old per-project knowledge base: one short line per fact the code cannot show (a choice, a trap, a constraint), kept under `## Project facts` in the repo's `CLAUDE.md`, or `AGENTS.md` when there is no `CLAUDE.md`. only `/ss:record-fact` writes them, each line approved by you, and `/ss:review` flags the file when it grows past about 60 lines. the contract is `plugins/ss/references/project-facts.md`.

### review

| skill              | description                                                                                                                                                    |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/ss:review`       | loop over the branch: every front in parallel, a judge on Sonnet (`ss-review-judge`), fixes and re-reviews, up to 3 rounds (`manual` to pick fronts and items) |
| `/ss:review-setup` | generate or update the repo's `CODE_REVIEW_GUIDE.md`, the rule source `/ss:review` reads                                                                       |

### helpers

| skill              | description                                                                                 |
| ------------------ | ------------------------------------------------------------------------------------------- |
| `/ss:investigate`  | answer a read only question about the code, a branch or its history, with evidence          |
| `/ss:caretake`     | look after the repo: triage open PRs and deps, suggest a takeover (never merges)            |
| `/ss:takeover`     | adopt or modernize someone else's PR, keeping the author's credit (never merges)            |
| `/ss:research`     | research code, content and visual references, verifying every claim                         |
| `/ss:write-readme` | generate a minimal centered-header README from repo facts                                   |
| `/ss:orchestrate`  | run one front from Desktop: a private front doc, work sessions, merges you authorize        |
| `/ss:manager`      | sit above the orchestrators: read every front, hand work off, relay, merge on authorization |

### situational

| skill         | description                                                                                             |
| ------------- | ------------------------------------------------------------------------------------------------------- |
| `/ss:correct` | encode a correction that landed twice as a check, proven on a past occurrence, on its own branch and PR |

`explain-the-number`, `attack-the-premise` and `prove-the-fix` stay out of the menu: an agent loads one by itself, mid-task, when its trigger in `plugins/ss/references/triggers.md` fires. every work-session brief, the bug-fix playbook, `/ss:ship` and `/ss:correct` reads that table first.

## on hermes

the Hermes port is not on main: it lives on the [`hermes-test`](https://github.com/athenabriana/shipshape/tree/hermes-test) branch.

develop locally:

```bash
git clone https://github.com/athenabriana/shipshape.git
claude --plugin-dir ./shipshape/plugins/ss    # load the plugin from disk to test
```

<sub>parts of `/ss:review` are adapted from Claude Code's `/simplify` and `/code-review` (Anthropic, Apache-2.0). individual components retain their original licenses.</sub>
