# Design-review loop: build, screenshot, critic, fix, repeat

Every interface change runs through this loop before it is called done: build it, take
screenshots of the running thing, have the `ss-design-critic` agent judge them, fix what
it finds, and repeat until the critic is pleased and the goals are achieved. There is no
default round limit. This page says when the loop runs, how to take the screenshots, how to
dispatch the critic, and when the loop stops. A work session, a `/ss:go` run, `/ss:ui-critique` (its entry point for a screen that
already exists), `/ss:review`'s design front and a plain session all follow it.

## When it runs

On any change a person sees: a screen, a component, a page, a flow, a mockup, a design
canvas, a print layout. It runs after the build and before the change is reported done,
asked for review, or shipped. On the mockup path of
`<plugin-root>/references/show-for-review.md` it runs three times over:

- **The faithful rebuild**: the canvas rebuild of an existing screen, with the screenshot
  of the running app as the reference, until the critic finds the match faithful. Only then
  is a change designed on top.
- **The design**: the changed canvas, before the person sees it and after each round of
  their comments, until the critic is pleased and the goals are achieved.
- **The build**: the screens built from the approved canvas, with that canvas as the
  reference, until they match it and the critic is pleased.

On the real-screen path it runs once, on the built screens.

## Real visuals, always

The loop judges screenshots of the running thing, never code alone. Reading the source
tells you what was meant; the screenshot tells you what the user gets.

- **Run it.** Start the app, page or component in an isolated instance (a dev server on
  its own port, a debug build, a story), never the instance the person is using.
- **Capture it** with whatever is at hand, in this order of preference:
  1. **Claude in Chrome** (`mcp__claude-in-chrome__*`), loaded by the `chrome-browser`
     skill: navigate, resize, act, and screenshot.
  2. **The built-in browser** of the desktop app, by its own skill.
  3. **The `run` skill**, which launches the project and drives it for screenshots.
  4. **The app's own screenshots**: an Electron debug port, a test harness that writes
     images, a design tool's export.

  Load each tool with `ToolSearch` before saying it is missing.

- **Cover the tasks.** For each task a user comes to do, capture every step and the state
  after it. Add the states the tasks pass by: empty, loading, error, disabled, hover,
  focus, overflow. Capture a web UI at a desktop width and at a phone width (390 px).
- **Name the files** by task and step (`checkout-1-cart.png`, `checkout-2-pay.png`) and
  keep them in the notes folder, or the session's scratchpad when there is none.

When no tool can render the interface, say so in one line in the report and run the
critic on the closest real visual there is (a canvas export, a mockup image). A review
from code alone is never reported as a visual check.

## Dispatch the critic

One critic per round: one `Agent` call with `subagent_type: "ss:ss-design-critic"`, fresh
and memoryless, as hard to please in the last round as in the first. The prompt carries, in this order:

1. The screenshot paths, grouped by task and step, with the widths.
2. The tasks in plain words.
3. The design sources the project has: the token file, the component library's path, the
   visual direction (`design/<surface>.md` or a path the brief names). None is required.
4. The round's work: round 1, everything; later rounds, the open findings with their
   numbers and the new screenshots.
5. The goals: the brief's goals and acceptance criteria, numbered, copied as written. The
   critic judges each one.
6. The reference, when there is one: the screenshot of the app that a mockup rebuilds, or
   the approved canvas that a build must match.
7. The cap, when the person set one in the brief.

Never send the builder's own opinion, a self-score, the time spent or the history of the
build. The critic judges what is on the screen.

When `Agent` cannot dispatch `ss:ss-design-critic`, run a `general-purpose` subagent whose
prompt opens with the body of `<plugin-root>/agents/ss-design-critic.md` below its
frontmatter, verbatim. Say so in one line. With no `Agent` tool at all, critique the
screenshots yourself against that file, and mark the round "self-judged" in the report.

## Fix, then repeat

- **Fix every finding**, High, Medium and Low, one change at a time: the critic is pleased
  only when it would send nothing back. A finding that asks for a screenshot you did not
  send, and every `missing` entry, is fixed by taking it.
- **Close every goal** the critic marked `not_achieved`, from what it says is missing.
- **Refuse a finding only with a ground** the next critic can check: it contradicts the
  person's request or the design source, quoted. A refused finding goes to the next round
  with its ground.
- **Take new screenshots** of every task the fixes touched, then dispatch a fresh critic
  with the open findings.

## When the loop stops

- **The critic is pleased and the goals are achieved**: `pleased` and `goals_achieved` are
  both true in the same round. Done.
- **The usage window runs low**: stop at a clean step (committed, pushed, reported), by
  `<plugin-root>/references/long-run.md`, and report where the loop stands.
- **The person set a cap in the brief** ("at most 3 design rounds") and it is reached.

Nothing else stops it. Without a cap the loop keeps going, round after round, however many
rounds that takes. A loop that stops before both verdicts are true reports the open
findings and the goals not achieved as they are, and never calls the interface done.

## Report

- **The two verdicts** of the last round, each goal with its status, and how many rounds
  ran.
- **A board of the final screenshots**, by `<plugin-root>/references/show-for-review.md`,
  next to the before when the change edits an existing screen.
- **What is still open**, one line per finding with its severity, and the refusals with
  their grounds.
