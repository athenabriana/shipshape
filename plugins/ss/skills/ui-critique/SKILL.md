---
name: ui-critique
description: Gets a screen the critic is pleased with and that passes WCAG AA. Runs when a page, app, mockup, Design canvas or folder of UI code needs judging, with no diff; solves UI judged by reading code instead of looking at it. Renders the target, screenshots it, and has the ss-design-critic agent and an accessibility audit judge it each round, then fixes and loops with no round limit until both verdicts hold, a cap you set, or the usage window runs low. Outputs the screenshots, the findings, the fixes and the two verdicts; critique only on request or when the target cannot be edited. Use when the user says "ui critique", "critique this screen", "critica essa tela", "design review of this page", "is this UI good", "does this folder follow the design system", "accessibility audit", "a11y", "WCAG", "contrast", "just critique" or "don't change anything". Don't use it on a branch's diff (use /ss:review, whose design and a11y fronts run there).
license: MIT
metadata:
  author: Athena Briana - github.com/athenabriana; the accessibility pass absorbed from /ss:review's a11y front, itself from rafael's ui-accessibility skill (loja inspira-skills, MIT)
  version: 1.3.1
---

# UI critique

`<plugin-root>` is `${CLAUDE_PLUGIN_ROOT}`: use that directory wherever this skill or a page it
reads writes `<plugin-root>`.

Point it at a screen and it judges what the user gets: screenshots of the running thing,
read by the `ss-design-critic` agent and walked for accessibility. By default it then fixes
what it found and judges again, round after round, until the critic is pleased, every goal
is achieved and no accessibility finding is open. This skill is `/ss:iterate`'s door for a
screen that already exists, with no branch to review: it runs the one loop engine,
`<plugin-root>/references/goal-loop.md`, with its judges fixed, the critic by
`<plugin-root>/references/design-loop.md` (iterate's design judge) and the
`ss-a11y-auditor` beside it. It keeps its own setup, rounds and report below.

A branch's diff is `/ss:review`'s: its design and a11y fronts judge the changed lines. This
skill judges the whole screen, whatever changed it.

Hard limits: code is never judged from its text alone; pushing and a PR are `/ss:ship`'s;
a login is asked for once, and credentials are never invented or stored.

## 1. Resolve the target and the mode

Read `references/setup.md` before this step: the target table, the mode, the design
sources, the loop folder and the UI references, in full.

- **The target**: a URL or running app, a folder of UI code, a Design canvas, a mockup,
  screenshots, or the current project's UI when nothing is named. A folder is rendered and
  screenshotted first; a canvas follows `references/canvas-target.md`.
- **The mode**: critique and fix by default. Critique only when the request says so ("just
  critique", "only tell me", "don't change anything", "audit") or the target cannot be
  edited from here; say in one line which reason put it there.
- **The design sources**, by `<plugin-root>/skills/review/references/front-design.md` §1;
  none is required.
- **The loop folder**: a `state.json` there means a restart: resume, never start round 1 over.
- **The UI references**: three to six real screens, by
  `<plugin-root>/references/ui-references.md`, gathered once before round 1.

## 2. Ask once, then run

Follow `<plugin-root>/references/long-run.md`: ask what is open in one decision sheet
(`<plugin-root>/references/decision-sheet.md`), then run to the end, asking again only on a
real blocker. Read `references/setup.md` "The decision sheet of step 2" for its blocks (the
goals with WCAG AA always one of them, their contradictions, mockup or real screen, a cap),
the canvas header line, the work session path and the branch rule. On code in critique and
fix, work on `ui-critique/<slug>` when the tree is on the default branch.

## 3. A round

Read `references/round.md` "A round" before round 1. Every round:

1. **Screenshots** of every task and state the goals name, at a desktop width and 390 px,
   into `shots/r<N>/`, scoped after round 1; the rendered checks of
   `references/a11y-pass.md` §3 run here.
2. **The critic and the auditor, in one message**: `ss:ss-design-critic` and
   `ss:ss-a11y-auditor`, fresh and memoryless, plus the design system pass
   (`references/design-system-pass.md`) when a design source resolved on code.
3. **Pool the findings** into one numbered list with source, severity and evidence.
4. **Decide the round**: pleased only when the critic says `pleased: true` and
   `goals_achieved: true` and no accessibility or design system finding is open; only a
   pleased full pass ends the loop.
5. **Show the convergence** as the round's line in the task list.

In critique only, round 1 ends here: go to the report.

## 4. Fix, then the next round

Read `references/round.md` "Fix, then the next round" before the first fix. Fix every open
finding in batches by cause, on the canvas, the mockup path or the real screen; refuse one
only with a quoted ground. End each round at a clean step: commit or republish, then write
`state.json`. The loop stops only by `design-loop.md` "When the loop stops".

## 5. Report

Read `references/report-and-edges.md` "The report" before writing it: the verdicts with
`WCAG AA: pass | fail | partial`, the trend, what is carried to the build, the board, what
is still open, the UI references, the decisions taken alone, and the loop folder's path.

## 6. Gate

When this session is a work session `/ss:orchestrate` opened, the gate goes through
`<plugin-root>/references/front-contract.md` instead of a local dialog.

One question by `<plugin-root>/references/handoff-gate.md`, after the board, the first
options that apply:

1. critique only, with findings and a target that can be edited → **"Fix it until
   pleased (Recommended)"** (runs step 4 onward)
2. stopped at a cap or the usage window with findings open → **"Run more rounds"**
3. fix commits on a branch → **"Ship it: I run /ss:ship"**
4. always last → **"Stop here"** (what stays: the commits and the report; how to resume:
   `/ss:ui-critique`)

## Edge cases

When something goes off the path (no renderer, a login, a branch named, no git repo,
someone else's site, an agent that cannot be dispatched, a fix that breaks a goal, the
critic against the design source, a finding back after its second fix, the usage window
low, a restart, a canvas board that is not static), read the table in
`references/report-and-edges.md` "Edge cases".

## Bundled resources

- `references/setup.md`: steps 1 and 2, the target, the mode, the sources and the sheet.
- `references/round.md`: steps 3 and 4, a round and its fixes.
- `references/report-and-edges.md`: step 5's report and the edge cases table.
- `references/a11y-pass.md`: the accessibility pass of every round, WCAG AA over the rendered target and its source.
- `references/design-system-pass.md`: the design system pass, the target's code against the project's design sources.
- `references/canvas-target.md`: a Design canvas turned into screenshots, the contact sheets, the republish, and what a canvas cannot show.

Shared, at the plugin root:

- `<plugin-root>/references/goal-loop.md`: the loop engine `/ss:iterate` opens, which this skill runs with its judges fixed.
- `<plugin-root>/references/design-loop.md`: iterate's design judge: the screenshots, the critic's prompt, when it stops, the report.
- `<plugin-root>/references/long-run.md`: ask once, then run; the cap and the usage window.
- `<plugin-root>/references/show-for-review.md`: the mockup or the real screen, and the board.
- `<plugin-root>/references/ui-references.md`: real screens for the pattern, Inspo first, given to the critic each round, and the setup of a missing source.
- `<plugin-root>/agents/ss-design-critic.md`: the critic, very hard to please, and its two verdicts.
- `<plugin-root>/agents/ss-a11y-auditor.md`: the accessibility auditor, WCAG AA with contrast computed from the tokens.
- `<plugin-root>/scripts/render_canvas.py`: renders a canvas's artboards with headless Chrome, measures fill heights, and lays out contact sheets.
- `<plugin-root>/skills/review/references/front-a11y.md` and `front-design.md`, `design-checklist.md` beside them: the criteria and finding shapes both passes share with `/ss:review`.
