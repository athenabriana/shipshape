---
name: review-setup
description: Writes the repo's CODE_REVIEW_GUIDE.md, the rules /ss:review checks against. Runs when a repo has no guide, when /ss:review reports drift, or when /ss:learn picks the review rule layer for one lesson; solves review rules living only in people's heads. Runs discovery with parallel subagents, interviews the maintainer to validate every rule, and outputs the guide at the repo root, generated from scratch or updated surgically, uncommitted. Use when the user says "set up code review", "generate the review guide", "create the CODE_REVIEW_GUIDE", "update the review guide", or "the review guide is stale". Don't use it to review code (use /ss:review) or to keep a single lesson whose layer is not picked (use /ss:learn).
license: MIT
metadata:
  author: Athena Briana - github.com/athenabriana
  version: 2.5.1
---

# Review setup

Produce the repo's `CODE_REVIEW_GUIDE.md`, the single source of truth for what
"good" means in this codebase: rules with IDs, finding levels, and evidence, validated
by the maintainer in an interview. `/ss:review` reads it fresh on every run;
developers read it before opening PRs. **The guide is the only output**, no
per-repo skill is generated; the review engine is `/ss:review` itself.

**Review rules live in the guide alone.** No rule goes into `AGENTS.md`,
`CLAUDE.md` or `.claude/CLAUDE.md`: those files steer the agent writing code, and
their `## Project facts` section belongs to `/ss:learn`
(`<plugin-root>/references/project-facts.md`). Discovery may read them as evidence. A
finding that is a project fact rather than a review rule (a choice, a trap, a
constraint the code cannot show) is named in the closing report with an offer of
`/ss:learn`, never written by this skill. A single lesson arrives here from `/ss:learn`,
which picked the review rule layer, and runs in update mode.

This SKILL.md is the router: it picks the mode, and each phase's method lives in
its own reference, loaded only when that phase runs.

## Finding levels

Every rule in the guide carries one of two levels, `HIGH` or `LOW`, defined
once in `<plugin-root>/references/finding-levels.md`: what each one means, the
concrete-cost gate that separates an inline comment from a body line, and how a rule
still ranked `MEDIUM` reads. The guide is the surface that states them as `HIGH` and
`LOW`; a review reports the same two as Bloqueante and Sugestão, and that file carries
which name goes where. Read it before discovery suggests a
level, and again before the guide is written. `/ss:review` reads the same file, which
is why the scale lives outside both skills.

## Mode selection

- `CODE_REVIEW_GUIDE.md` absent at the repo root → **setup** (full generation).
- Present → **update** (delta only: never re-interview what didn't change).

If `$ARGUMENTS` names a focus area, constrain discovery (either mode) to that
domain.

## Setup mode

1. **Discovery** → `references/discovery.md`: 5 parallel read-only subagents
   (stack & structure, patterns & conventions, git history & PRs, CI/CD &
   quality, security & contracts), then rule extraction into
   Confirmed/Candidate tables with IDs, levels, and evidence.
2. **Interview** → `references/interview.md`: the maintainer validates via
   `AskUserQuestion`: confirmed rules in one batch, candidates one at a
   time. Every rule in the guide was accepted by a human, none slipped in.
3. **Generate** → `references/guide-template.md`: write `CODE_REVIEW_GUIDE.md`
   at the repo root from the validated rules.

## Update mode

Follow `references/update-delta.md`: read the existing guide, run 3 delta
subagents (new patterns, drifted rules, git history since the guide's last
change), interview **only** on what changed, then edit the guide surgically:
preserve rule IDs, never renumber, never rewrite untouched sections.

## Closing

No handoff gate, report and stop:

- Name what was written/changed: rule counts per level, new/updated/removed
  IDs (update mode). When the ladder was migrated, say so on its own line.
- Remind: "The guide takes effect on the next `/ss:review`. It reads
  CODE_REVIEW_GUIDE.md fresh on every run."
- If a legacy generated skill exists at `.claude/skills/code-review/SKILL.md`,
  flag it as superseded by `/ss:review` and suggest the user delete it (their
  action, not yours).
- Suggest committing the guide so CI-side and teammates' reviews see it.
- Name any project fact the interview surfaced, with the offer of `/ss:learn`.

## Edge cases

| WHEN                                             | THEN                                                                  |
| ------------------------------------------------ | --------------------------------------------------------------------- |
| update mode, no changes detected by any subagent | report "no significant changes since the last update", stop           |
| the existing guide still ranks a rule `MEDIUM`   | migrate the ladder in the same pass, no interview                     |
| repo > 1000 files                                | sample representative files per directory instead of exhaustive scans |
| maintainer rejects every candidate               | guide ships with confirmed rules only; thin is fine, invented is not  |
| legacy `.claude/skills/code-review/` present     | flag as superseded; never regenerate it                               |
| not a git repo                                   | report the error, stop                                                |
| a rule the maintainer wants in `CLAUDE.md`       | it goes in the guide; a project fact is offered to `/ss:learn`        |

## Bundled resources

- `references/discovery.md`: the 5 discovery subagent prompts + rule extraction format.
- `references/interview.md`: the `AskUserQuestion` validation protocol (setup and update variants).
- `references/guide-template.md`: the CODE_REVIEW_GUIDE.md template and generation rules.
- `references/update-delta.md`: delta discovery, incremental interview, surgical edits.

References (plugin root):

- `<plugin-root>/references/finding-levels.md`: `HIGH` / `LOW` in the guide (Bloqueante / Sugestão in a review), the concrete-cost gate and the `MEDIUM` collapse. Shared with `/ss:review`.
