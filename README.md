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

it ships a `SessionStart` operating-context hook, auto-active on install. skills are invoked as `/ss:<skill>`, e.g. `/ss:shape`, `/ss:build`, `/ss:ship`.

## what's inside

one plugin, `ss`; the skills are organized by use.

### shape → build → ship

| skill          | description                                                                                                                       |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `/ss:shape`    | align on the idea before building: draft, loop on the gray areas through questions, map behavior, order the tasks, write the spec |
| `/ss:build`    | run a spec end to end: build every phase of tasks, track its `status`, chain into review and ship when the scope says so          |
| `/ss:ship`     | land the branch your way: green the checks, then push to a branch, prep a push to main, or open a PR and tend it until you stop   |
| `/ss:diagnose` | fix a bug with no spec: find the cause, reproduce it, make the smallest fix, prove it, hand it to ship                            |

shape and build keep `.ss/wiki/` up to date by themselves: a per-project knowledge base of the facts the code does not show (a choice, a trap, a constraint), each tied to the paths it covers. shape reads it before the draft, build hands each task the facts covering its files, and review's contract front checks the diff against them. the contract is `plugins/ss/references/wiki-state.md`.

### review

| skill              | description                                                                                                                                   |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `/ss:review`       | loop over the branch: every front in parallel, a second-model judge, fixes and re-reviews, up to 3 rounds (`manual` to pick fronts and items) |
| `/ss:review-setup` | generate or update the repo's `CODE_REVIEW_GUIDE.md`, the rule source `/ss:review` reads                                                      |

### helpers

| skill                       | description                                                                      |
| --------------------------- | -------------------------------------------------------------------------------- |
| `/ss:gather-branch-context` | summarize every change on the branch against main                                |
| `/ss:caretake`              | look after the repo: triage open PRs and deps, suggest a takeover (never merges) |
| `/ss:takeover`              | adopt or modernize someone else's PR, keeping the author's credit (never merges) |
| `/ss:research`              | research code, content and visual references, verifying every claim              |
| `/ss:write-readme`          | generate a minimal centered-header README from repo facts                        |
| `/ss:orchestrate`           | split a large piece of work into side sessions and relay between them            |

### situational

| skill         | description                                                                                             |
| ------------- | ------------------------------------------------------------------------------------------------------- |
| `/ss:correct` | encode a correction that landed twice as a check, proven on a past occurrence, on its own branch and PR |

`explain-the-number`, `attack-the-premise` and `prove-the-fix` stay out of the menu: an agent loads one by itself, mid-task, when its trigger in `plugins/ss/references/triggers.md` fires. every build task, orchestrate brief, `/ss:diagnose`, `/ss:ship` and `/ss:correct` reads that table first.

## on hermes

`plugins/ss-hermes` is a separate plugin built for [Hermes Agent](https://hermes-agent.nousresearch.com/). It does not share files with `plugins/ss` at runtime. Instead of one skill per verb it has one rigor mode, `/ss:go` (for example `/ss:go work on a b c`), that matches a request to a playbook and sizes the process to the risk. The design is in [`plugins/ss-hermes/DESIGN.md`](plugins/ss-hermes/DESIGN.md).

```bash
hermes plugins install athenabriana/shipshape#plugins/ss-hermes --enable
```

| skill             | description                                                                  |
| ----------------- | ---------------------------------------------------------------------------- |
| `/ss:go`          | the entry point: pick a playbook, size the route, run the steps              |
| `/ss:investigate` | answer a read-only question about code, a branch or earlier sessions         |
| `/ss:bug-fix`     | reproduce, find the cause, make the smallest fix and prove it                |
| `/ss:review`      | review the branch or a PR, with a judge on a second model                    |
| `/ss:ship`        | green CI, open or finish the PR, and watch it with a cron job (never merges) |
| `/ss:edge-cases`  | map edge cases before coding, or hunt and prove the ones a diff misses       |
| `/ss:setup`       | check the plugin and the model routes for the reviewer and scout subagents   |
| `/ss:fronts`      | on the main Bot: create, manage and retire one Bot per front                 |

develop locally:

```bash
git clone https://github.com/athenabriana/shipshape.git
claude --plugin-dir ./shipshape/plugins/ss    # load the plugin from disk to test
```

<sub>parts of `/ss:review` are adapted from Claude Code's `/simplify` and `/code-review` (Anthropic, Apache-2.0). individual components retain their original licenses.</sub>
