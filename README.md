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

shape and build keep `.ss/wiki/` up to date by themselves: a per-project knowledge base of the facts the code does not show (a choice, a trap, a constraint), each tied to the paths it covers. shape reads it before the draft, build hands each task the facts covering its files, and review's contract front checks the diff against them. The contract is `plugins/ss/references/wiki-state.md`.

### review

| skill              | description                                                                                        |
| ------------------ | -------------------------------------------------------------------------------------------------- |
| `/ss:review`       | pick the fronts, fan out read-only finders, verify every finding, then fix or comment item by item |
| `/ss:review-setup` | generate or update the repo's `CODE_REVIEW_GUIDE.md`, the rule source `/ss:review` reads           |

### helpers

| skill                       | description                                                                  |
| --------------------------- | ---------------------------------------------------------------------------- |
| `/ss:gather-branch-context` | summarize every change on the branch against main                            |
| `/ss:triage`                | triage PRs and deps, take over or modernize someone else's PR (never merges) |
| `/ss:code-deep-research`    | find, clone and explore real repos, verifying every finding against source   |
| `/ss:write-readme`          | generate a minimal centered-header README from repo facts                    |
| `/ss:orchestrate`           | split a large piece of work into side sessions and relay between them        |

develop locally:

```bash
git clone git@github.com:athenabriana/shipshape.git
claude --plugin-dir ./shipshape-skills/plugins/ss    # load the plugin from disk to test
```

<sub>parts of `/ss:review` are adapted from Claude Code's `/simplify` and `/code-review` (Anthropic, Apache-2.0). individual components retain their original licenses.</sub>
