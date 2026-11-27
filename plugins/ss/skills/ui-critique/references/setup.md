# Setup: the target, the mode, the sources and the sheet

Steps 1 and 2 of `/ss:ui-critique` read this page: what step 1 resolves before round 1,
and what step 2 asks in its one decision sheet.

## The target

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

## The mode

**The mode** is one of two:

- **Critique and fix** (the default): the loop of steps 3 and 4 runs until it stops by
  `design-loop.md` "When the loop stops".
- **Critique only**: when the request says so ("just critique", "only tell me", "don't
  change anything", "audit"), or when the target cannot be edited from here: someone
  else's site, screenshots with no code behind them in this repo, a canvas the person does
  not own. It runs round 1, reports, and stops. Say in one line which reason put it there.

## The design sources

**The design sources** come from `<plugin-root>/skills/review/references/front-design.md`
§1: a token source the project reads, then a visual direction in `design/<surface>.md` or a
path the brief names. Keep every rung that resolves. None is required: with none, the
critic judges the screens on their own craft and the design system pass is skipped, said
in one line.

## The loop folder

**The loop folder** holds the state, the screenshots and any tool the loop writes, by
`design-loop.md` "The loop folder": the notes folder the brief names, else
`~/.ss/runs/<slug>/`. When it already has a `state.json`, this is a restart: resume from
it, and never start round 1 over.

## The UI references

**The UI references** are three to six real screens that solve the same pattern, gathered
before round 1 by `<plugin-root>/references/ui-references.md`: Inspo and Screenrove first
when their tools are there, then live sites through Chrome DevTools MCP or the browser,
then `/ss:research`'s visual front, with an offer to set up a missing source. Say in
one line which source they came from. They are gathered once and go to the critic in every
round.

## The decision sheet of step 2

Follow `<plugin-root>/references/long-run.md`. Before the first screenshot, list what the
request, the brief and the repo leave open, and ask it all in one decision sheet
(`<plugin-root>/references/decision-sheet.md`), each block with a default, the header line
saying that after this the run goes to the end and asks again only on a real blocker. The
blocks, each only when it is open:

- **The goals.** What the screen should let a user do and what done looks like, numbered,
  each with the screenshot of a named state or the check that confirms it, by
  `goal-loop.md` section 2.
  Taken from the request or the brief when they state them, copied as written. When there
  are none, `/ss:clarify` proposes them in this sheet ("What should this screen do?"), with defaults drawn from what the screen
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
