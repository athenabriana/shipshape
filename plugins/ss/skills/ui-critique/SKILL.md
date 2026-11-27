---
name: ui-critique
description: Critiques a UI on real screenshots and, by default, fixes it until the ss-design-critic agent is pleased and every goal is met, with an accessibility check (WCAG AA) each round whose findings block the end too. Takes a running page or app (a URL or localhost), screenshots, a mockup, a Design canvas, or a folder or files of UI code, which it renders first. Asks once for the goals when none are given, then loops with no round limit until both verdicts hold, a cap you set, or the usage window runs low. Critique only on request or when the target cannot be edited. Use when the user says "ui critique", "critique this screen", "critica essa tela", "design review of this page", "is this UI good", "does this folder follow the design system", "accessibility audit", "a11y", "WCAG", "contrast", "just critique" or "don't change anything". Don't use it to review a branch's diff (use /ss:review, whose design and a11y fronts run there).
license: MIT
metadata:
  author: Athena Briana - github.com/athenabriana; the accessibility pass absorbed from /ss:review's a11y front, itself from rafael's ui-accessibility skill (loja inspira-skills, MIT)
  version: 1.2.0
---

# UI critique

Point it at a screen and it judges what the user gets: screenshots of the running thing,
read by the `ss-design-critic` agent and walked for accessibility. By default it then fixes
what it found and judges again, round after round, until the critic is pleased, every goal
is achieved and no accessibility finding is open. The loop is
`<plugin-root>/references/design-loop.md`, the interface specialization of the goal loop
in `<plugin-root>/references/goal-loop.md`; this skill is its entry point for a screen that
already exists, with no branch to review.

A branch's diff is `/ss:review`'s: its design and a11y fronts judge the changed lines. This
skill judges the whole screen, whatever changed it.

## 1. Resolve the target and the mode

**The target** is whatever the request points at. Each kind reaches the screenshots its own
way:

| target                          | how it is rendered                                                                   | what a fix edits          |
| ------------------------------- | ------------------------------------------------------------------------------------ | ------------------------- |
| a URL, localhost, a running app | opened in the browser or app tools, by `design-loop.md` "Real visuals, always"       | the code behind it, here  |
| a folder or files of UI code    | run in an isolated instance (a dev server on its own port, a story, the `run` skill) | those files               |
| a Design canvas                 | its artboards read into the loop folder and rendered locally, by `canvas-target.md`  | the canvas, republished   |
| a mockup image or export        | read as given                                                                        | the mockup's source       |
| screenshots                     | read as given                                                                        | the code, when it is here |
| nothing named                   | the UI of the current project, run as a folder                                       | the project's UI files    |

A Design canvas is its own path: the fixes land on the canvas, with no faithful rebuild
and no build step, by `references/canvas-target.md`, which also says what a canvas cannot
show.

Code is never judged from its text alone: a folder is rendered and screenshotted first. When
nothing can render it, say so in one line, run the accessibility pass on the source alone,
and never report the round as a visual check.

**The mode** is one of two:

- **Critique and fix** (the default): the loop below runs until it stops by
  `design-loop.md` "When the loop stops".
- **Critique only**: when the request says so ("just critique", "only tell me", "don't
  change anything", "audit"), or when the target cannot be edited from here: someone
  else's site, screenshots with no code behind them in this repo, a canvas the person does
  not own. It runs round 1, reports, and stops. Say in one line which reason put it there.

**The design sources** come from `<plugin-root>/skills/review/references/front-design.md`
§1: a token source the project reads, then a visual direction in `design/<surface>.md` or a
path the brief names. Keep every rung that resolves. None is required: with none, the
critic judges the screens on their own craft and the design system pass is skipped, said
in one line.

**The loop folder** holds the state, the screenshots and any tool the loop writes, by
`design-loop.md` "The loop folder": the notes folder the brief names, else
`~/.ss/runs/<slug>/`. When it already has a `state.json`, this is a restart: resume from
it, and never start round 1 over.

**The UI references** are three to six real screens that solve the same pattern, gathered
before round 1 by `<plugin-root>/references/ui-references.md`: Inspo and Screenrove first
when their tools are there, then live sites through Chrome DevTools MCP or the browser,
then `/ss:research`'s visual front, with an offer to set up a missing source. Say in
one line which source they came from. They are gathered once and go to the critic in every
round.

## 2. Ask once, then run

Follow `<plugin-root>/references/long-run.md`. Before the first screenshot, list what the
request, the brief and the repo leave open, and ask it all in one decision sheet
(`<plugin-root>/references/decision-sheet.md`), each block with a default, the header line
saying that after this the run goes to the end and asks again only on a real blocker. The
blocks, each only when it is open:

- **The goals.** What the screen should let a user do and what done looks like, numbered,
  each with the screenshot of a named state or the check that confirms it, by
  `goal-loop.md` section 2.
  Taken from the request or the brief when they state them, copied as written. When there
  are none, `/ss:clarify-goals` proposes them in this sheet ("What should this screen do?"), with defaults drawn from what the screen
  plainly is ("A new visitor understands the product and finds sign up", "The form can be
  filled and sent by keyboard alone"). The critic judges each goal; WCAG AA is always one of
  them, unasked.
- **The goals' contradictions**, by `design-loop.md` "Check the goals before round 1": each
  one with both sides quoted and the recommended pick first. Build-only goals are no
  question: they are marked with their ground and listed in the sheet's header line.
- **Mockup or real screen**, in critique and fix on code: "When changes are needed, start
  on a mockup or go straight to the real screen?", the mockup first and recommended, by
  `<plugin-root>/references/show-for-review.md` "A mockup first, or the real screen". A
  target that is already a mockup or a canvas skips this block.
- **A cap**, only when the request hints at a limit without naming it. Otherwise there is
  none, and the loop runs until the verdicts hold or the usage window runs low.

On a canvas, the sheet's header line also says that each round renders and screenshots the
canvas: running this skill is the ask the Design type waits for before verifying.

A request that already settles every block needs no sheet: start at once. In a work
session the sheet travels to the orchestrator as one `ss.ask` JSON, by
`<plugin-root>/references/front-contract.md`.

On code in critique and fix, work on a branch of its own when the tree is on the default
branch (`ui-critique/<slug>`), never on the one the person has checked out with their own
changes.

## 3. A round

Every round is the same, from round 1 to the last:

1. **Screenshots.** Render the target and capture every task the goals name, each step and
   the states it passes by (empty, loading, error, disabled, hover, focus, overflow), at a
   desktop width and at 390 px, by `design-loop.md` "Real visuals, always", into the loop
   folder's `shots/r<N>/`. A canvas is rendered by `references/canvas-target.md`. After
   round 1 the round is scoped: capture again what the last fixes touched, plus anything a
   finding asked for, and a contact sheet of the rest; a full pass captures everything, by
   `design-loop.md` "Scoped rounds and the full pass". With the browser in hand, run the rendered accessibility checks here too
   (`references/a11y-pass.md` §3): the `Tab` walk, the accessibility tree, the live
   regions.
2. **The critic and the auditor, in one message.** One `Agent` call with
   `subagent_type: "ss:ss-design-critic"`, fresh and memoryless, with the prompt
   `design-loop.md` "Dispatch the critic" lists, the UI references included; beside it, one
   with `subagent_type: "ss:ss-a11y-auditor"`, fresh and memoryless, given the screenshots,
   the source, the tokens, the rendered checks of step 1, the round's open accessibility
   findings, the target kind and the paths of `references/a11y-pass.md` and
   `<plugin-root>/skills/review/references/front-a11y.md`. When a design source resolved
   and the target is code, the design system pass (`references/design-system-pass.md`)
   runs beside them. Record each agent's id in `state.json` as it is dispatched.
3. **Pool the findings.** One numbered list across the three: each item with its source
   (critic, accessibility, design system), its severity in its own words (High, Medium,
   Low for the critic and the design system; Critical, Major, Minor, Enhancement for
   accessibility) and its screenshot or `file:line`.
4. **Decide the round.** It is **pleased** only when the critic returned
   `pleased: true` and `goals_achieved: true` and no accessibility or design system
   finding is open. Accessibility findings block like the critic's: a page the critic
   loves and a keyboard cannot reach is not done. A check the auditor lists as "not
   reachable on a canvas" blocks nothing: it is carried to the build. A scoped round that
   comes back pleased is not the end: the next round is the full pass, and only a pleased
   full pass ends the loop.
5. **Show the convergence**, by `design-loop.md` "Convergence": the open findings by
   severity and the trend so far, as the round's line in the task list.

In critique only, round 1 ends here: go to the report.

## 4. Fix, then the next round

In critique and fix, by `design-loop.md` "Fix, then repeat":

- **On a canvas target**, the fixes are edited in the loop folder's copy of the
  artboards, every fill board's height measured again, and the canvas republished to its
  own URL, by `references/canvas-target.md`.
- **On the mockup path** of a code target, the fixes land on the canvas first, through the loop
  `show-for-review.md` describes (the faithful rebuild, the design, the person's approval),
  and the code is written from the approved canvas.
- **Fix in batches**, by `design-loop.md` "Fix, then repeat": group the findings that share
  a cause (a token, a component, a pattern across screens), fix each group in one change,
  and list the groups with the findings each closes in the round's line.
- **On the real screen**, fix every open finding, every severity, group by group.
  An accessibility fix is the concrete fix its row names. A finding is refused only with
  a ground the next round can check: it contradicts the person's request, the goals or
  the design source, quoted. A refused finding rides into the next round with its ground.
- **End each round at a clean step**: commit the code that changed, in the repo's
  conventional style, or republish the canvas; then write `state.json`. A stop at any
  point is then a clean step. Pushing and a PR are `/ss:ship`'s, offered at the gate.

Then the next round, with the open findings and the refusals in the critic's prompt. The
loop stops only as `design-loop.md` "When the loop stops" says: both verdicts true with no
accessibility or design system finding open, the person's cap, or the usage window running
low (read with `mcp__ccd_session_mgmt__get_usage` after each round, by `long-run.md`).

## 5. Report

By `design-loop.md` "Report", plus the accessibility line:

- **The verdicts** of the last round: `pleased`, `goals_achieved` with each goal's status,
  and `WCAG AA: pass | fail | partial` with the count per priority. How many rounds ran,
  and why the loop stopped.
- **The trend**: open findings per round, by severity, first to last, and each round's
  fix groups.
- **Carried to the build**: the build-only goals and the checks not reachable on a canvas,
  each with its ground.
- **A board of the screenshots**, by `<plugin-root>/references/show-for-review.md`: the
  before next to the after in critique and fix; in critique only, each finding pinned to
  its screenshot.
- **What is still open**: one line per finding with its source and severity, and the
  refusals with their grounds. In critique only, every finding, ranked: Critical and
  High first, each with a concrete fix.
- **The UI references**: the source line, then each reference with why it fits and its
  link. A finding that rests on a reference carries that reference's link beside it, and
  the board shows the reference next to the screen it judges.
- **Decided on my own**, one line each, by `long-run.md`.
- **The loop folder's path**, where the screenshots and the state stay.

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

| WHEN                                          | THEN                                                                                                  |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| no tool can render the target                 | say so in one line; the accessibility pass runs on the source; nothing is called a visual check       |
| the target needs a login                      | ask once for the access, as a real blocker; never invent or store credentials                         |
| the request names a branch or a diff          | it is a review: say so and point to `/ss:review`, whose design and a11y fronts run on the diff        |
| asked outside a git repository                | a URL, screenshots or a canvas need no repo; fixes to code are not possible, so it runs critique only |
| the target is someone else's site             | critique only, said in one line                                                                       |
| `Agent` cannot dispatch `ss:ss-design-critic` | the fallback in `design-loop.md` "Dispatch the critic", said in one line                              |
| a fix for one finding breaks another goal     | revert it, refuse the finding with that goal quoted as the ground, and keep going                     |
| the critic contradicts the design source      | the design source wins; refuse the finding with the source quoted                                     |
| a finding comes back after its second fix     | `attack-the-premise` fires, by `<plugin-root>/references/triggers.md`; fix it at its cause            |
| the usage window runs low mid round           | finish the edit in hand, commit or republish, report with the reset time                              |
| the session restarts mid loop                 | read `state.json`; resume each unfinished agent with `SendMessage` to its id; retake missing shots    |
| `Agent` cannot dispatch `ss:ss-a11y-auditor`  | a `general-purpose` subagent opened with the agent file's body, as for the critic, said in one line   |
| a canvas board is not static                  | listed in one line; judged on the closest real visual; never reported as rendered                     |

## Bundled resources

- `references/a11y-pass.md`: the accessibility pass of every round, WCAG AA over the rendered target and its source.
- `references/design-system-pass.md`: the design system pass, the target's code against the project's design sources.
- `references/canvas-target.md`: a Design canvas turned into screenshots, the contact sheets, the republish, and what a canvas cannot show.

Shared, at the plugin root:

- `<plugin-root>/references/design-loop.md`: the loop, the screenshots, the critic's prompt, when it stops, the report.
- `<plugin-root>/references/long-run.md`: ask once, then run; the cap and the usage window.
- `<plugin-root>/references/show-for-review.md`: the mockup or the real screen, and the board.
- `<plugin-root>/references/ui-references.md`: real screens for the pattern, Inspo first, given to the critic each round, and the setup of a missing source.
- `<plugin-root>/agents/ss-design-critic.md`: the critic, very hard to please, and its two verdicts.
- `<plugin-root>/agents/ss-a11y-auditor.md`: the accessibility auditor, WCAG AA with contrast computed from the tokens.
- `<plugin-root>/scripts/render_canvas.py`: renders a canvas's artboards with headless Chrome, measures fill heights, and lays out contact sheets.
- `<plugin-root>/skills/review/references/front-a11y.md` and `front-design.md`, `design-checklist.md` beside them: the criteria and finding shapes both passes share with `/ss:review`.
