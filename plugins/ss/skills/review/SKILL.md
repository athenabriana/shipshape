---
name: review
description: Judges a change against its goals until the judge is pleased. Runs after the build and before every merge ask, or on an external PR by number; solves shipping a diff nobody checked against what it promised. On the current branch it loops by default, every front in parallel (edges among them when deep or named), each finding verified, then fixed and re-reviewed with a judge on Sonnet until every goal is met, no round limit. Outputs the verified findings, the fixes and the verdict line with the head sha. `/ss:review manual` lets you pick; `/ss:review deep` turns on every angle; `/ss:review edges` hunts the inputs a diff does not handle. Use when the user says "review my changes", "review the PR", "are there bugs here", "what could break", "edge cases", "o que pode quebrar", "answer the PR comments", "check it followed the project rules", or "review PR 42 in repo X". Don't use it on a screen with no diff (use /ss:ui-critique), to reach a measured bar (use /ss:iterate) or to land a branch (use /ss:ship).
license: Apache-2.0
metadata:
  author: Athena Briana - github.com/athenabriana; quality-pass material adapted from Claude Code's /simplify, angle/verify architecture adapted from Claude Code's /code-review (Anthropic, Apache-2.0), a11y front absorbed from rafael's ui-accessibility skill (loja inspira-skills, MIT)
  version: 3.2.1
---

# Review

One review skill, nine **fronts** of findings. The skill detects which fronts can
produce anything on this branch, asks which ones you want, runs them as a parallel
fan-out of read-only agents, and puts every candidate through an independent
verifier before it reaches the report. On the current branch the default is the **review
loop** (`references/loop.md`), the code specialization of
`<plugin-root>/references/goal-loop.md`: the main context fixes or refuses each verified
finding and closes each goal not achieved, and a judge subagent on Sonnet checks every goal
of the change and re-reads what changed, round after round, until every goal is achieved
and the judge is pleased on a full pass, or the usage window or a cap stops it. The manual flow
is interactive (report → you pick → apply → reply/resolve → re-report), and repeats until
you close it. Either way it ends at the review: a merge is a step of its own, on your word.

This SKILL.md is the router. Each front's method lives in its own reference and is
loaded **only when that front was picked**; each action likewise. Every step below names
the reference to read before it runs. Read `references/edge-cases.md` at step 0 and again
whenever the run meets a case no step covers (an empty diff, no PR, `gh` unauthenticated,
uncommitted changes, a dead agent, a stopped loop);
a script, agent or reference by what it holds is in `references/resources.md`.

## Prerequisites

Inside a git repository. `gh` authenticated (`gh auth status`) for anything
PR/CI-related; the diff fronts need no `gh`.

## Step 0: Load the review context

Read `references/review-context.md` first. It loads the finding levels
(`<plugin-root>/references/finding-levels.md`: every finding is a **Bloqueante** or a
**Sugestão**), the repo's `CODE_REVIEW_GUIDE.md` read fresh (no guide → no `rules` front),
the legacy `.claude/skills/code-review/` check, and the **intent read**
(`references/intent-read.md`), which runs before any finder; an external PR skips it.

## Step 1: Resolve the mode and the depth

Read `references/mode-and-depth.md` before resolving the mode and the depth: each mode's
conditions, the standard and deep definitions, and the goals read and judge seating of the
loop mode.

| Mode                 | When                                                                    | Goes to                                                                        |
| -------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| External PR          | a repo and/or PR number that isn't the current branch's                 | `references/mode-external-pr.md`, then stop                                    |
| Direct front ask     | the user named the front ("CI broke", "edge cases", `/ss:review edges`) | that front alone, step 2's question skipped, never the probe                   |
| A screen, not a diff | a folder, files, a URL or a running page                                | `/ss:ui-critique`: say so in one line, stop                                    |
| Otherwise            | current branch                                                          | the **review loop** (`references/loop.md`), or the manual flow when it says so |

The external PR mode is read-only over that PR; posting the review requires explicit
confirmation, and the review it posts is never an approval.

Depth is **standard** unless deep was asked for (`/ss:review deep`, "review deeply", or the
deep option at step 2). Deep dispatches every finder and verifier with `model: "opus"`; the
loop's judge stays on Sonnet. Carry the depth into the scope block.

## Step 2: Probe the fronts, then ask which ones

Load `references/fronts.md` (the catalog, the probe, the depth table), then read
`references/ask-fronts.md` for the question and the depth line. In the loop the question is
not asked: every available front runs, `threads` and `ci` included. Either way, say the
fronts and the depth in one line with the numbers the resolution produced.

## Step 3: Run the picked fronts in parallel

The catalog in `fronts.md` maps each picked front to its `references/front-*.md`;
that mapping is the list, so a front added to the engine reaches this router with no
edit here. Load only the picked fronts' references (`references/front-correctness.md`,
`references/front-edges.md`, `references/front-quality.md`, `references/front-rules.md`,
`references/front-contract.md`, `references/front-a11y.md`, `references/front-design.md`,
`references/front-threads.md`, `references/front-ci.md`, and the criteria they operationalize
in `references/review-checklist.md`, `references/quality-checklist.md`,
`references/design-checklist.md`), build the
shared scope block (the resolved diff range included), and send every finder agent in
**one message** (Agent tool, `subagent_type: ss:ss-review-finder`, which carries the finder
contract in its own prompt; the main context is the only writer). `threads` and `ci` don't
fan out: script/`gh` reads plus judgment here.

Then `references/verify.md`: pool everything at the barrier, group by file, one
independent verifier per file (CONFIRMED / PLAUSIBLE / REFUTED), sweep on deep runs, then
dedupe, rank and cap. In the loop the judge takes the verifier's seat: one `Agent` call with
`subagent_type: "ss:ss-review-judge"`.

## The loop: rounds in place of steps 5 and 7

In the loop, round 1 is steps 3 and 4's work, then `references/loop.md` runs ("The loop in
the router" holds the whole sequence): the owner fixes or refuses every verified item with no
curation question, the judge rounds run until every goal is achieved and it is pleased on a
full pass, or the usage window or the person's cap stops it; then the push, the thread
replies, step 6, CI to the end, the verdict line, and the gate (step 8).

## Step 4: Report

Read `references/report.md` before writing it: one numbered report across all fronts, each
item with its front, its level, its verdict and its front's columns; an item the
conversation already covers is marked `[já dito: <link>]`, never dropped; then what came back
clean, refuted, left with no verdict, cut by the cap, suppressed from GitHub, and one stats
line. Clean everywhere → say so and jump to the gate (step 8).

## Steps 5 to 7: Curate, resolve, apply

Read `references/curate-and-apply.md` before step 5.

- **Step 5, curate:** show the report by `<plugin-root>/references/show-for-review.md`, then
  one `AskUserQuestion` (`multiSelect`): which items, fixed or commented on the PR.
- **Step 6, resolve satisfied threads:** runs whether the user picked anything or nothing;
  a thread only answered stays open for its opener.
- **Step 7, apply:** `references/act-apply-fixes.md` (regression guard) and
  `references/act-comment-findings.md` (body shown before anything is posted). Commits are
  conventional with no AI attribution; an answered thread gets a reply and is never
  resolved, the reviewer closes it; CI fixes cap at 3 cycles, then report what is still red.

## Step 8: Gate

Read `references/gate.md` before asking. One question per
`<plugin-root>/references/handoff-gate.md`, 2–4 options, the first three of five states in
priority order, last option always **"Stop here"**. In a work session `/ss:orchestrate`
opened, every question of this skill goes through `<plugin-root>/references/front-contract.md`
instead of a local dialog.
