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

Before round 1, gather real references for the pattern, by
`<plugin-root>/references/ui-references.md`, once for the whole loop. The critic gets them
in every round.

## Check the goals before round 1

The goals are read against their own sources once, before the first screenshot: the
request, the brief, the decisions file, the design sources and the target itself.

- **A contradiction** between two of them (a goal of a light theme only and a decisions
  file that keeps a dark one, a settings screen that offers what a goal rules out) is
  raised once, in the opening decision sheet, each side quoted with its file and line and
  the recommended pick first. With no sheet left to ask in, take the brief's side and name
  it under "decided on my own".
- **A build-only goal** is one the target kind cannot carry: on a mockup or a canvas, "built
  from the project's components" or "the live keyboard walk passes". Mark it build only,
  with the ground ("a canvas cannot mount ui-sdk"). The critic records it as
  `deferred_to_build`, it does not hold back `goals_achieved`, and the report carries it to
  the build. What the mockup must already show for it is still judged.

## The loop folder

A loop runs long, and the scratchpad can be cleared mid-run. Everything the loop needs to
go on lives in one durable folder: the notes folder the brief names, else
`~/.ss/runs/<slug>/`, with `<slug>` from the target's name. Never the scratchpad.

```
<loop folder>/
├── state.json        # the goals, the round number, open findings and refusals, the trend, agent ids
├── shots/r<N>/       # each round's screenshots, contact sheets and shots.json
├── canvas/           # a canvas target's artboard files, the copy each round edits
└── tools/            # any script the loop writes: a generator, a measuring helper
```

`state.json` is written after each step of a round: the screenshots taken, each agent
dispatched (its id from the `Agent` result) and each agent's return. On a restart, read it
first. An agent that was dispatched and has no return is resumed with `SendMessage` to its
id, asking it to finish and return its JSON; only when that fails is it dispatched fresh,
with the same prompt. A round's screenshots that are missing from `shots/` are taken
again before anything is judged.

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
- **A Design canvas** is read into the loop folder and rendered locally, by
  `<plugin-root>/skills/ui-critique/references/canvas-target.md`.
- **Name the files** by task and step (`checkout-1-cart.png`, `checkout-2-pay.png`) and
  keep them in the loop folder's `shots/r<N>/`.

When no tool can render the interface, say so in one line in the report and run the
critic on the closest real visual there is (a canvas export, a mockup image). A review
from code alone is never reported as a visual check.

## Dispatch the critic

One critic per round: one `Agent` call with `subagent_type: "ss:ss-design-critic"`, fresh
and memoryless, as hard to please in the last round as in the first. The prompt carries, in this order:

1. The screenshot paths, grouped by task and step, with the widths: every one in round 1
   and in a full pass, and in a scoped round the changed ones at full resolution plus a
   contact sheet of the rest, by "Scoped rounds and the full pass" below.
2. The tasks in plain words.
3. The design sources the project has: the token file, the component library's path, the
   visual direction (`design/<surface>.md` or a path the brief names). None is required.
4. The round's work: round 1 and a full pass, everything; a scoped round, the open
   findings with their numbers, the screens that changed, and the fix groups applied.
5. The goals: the brief's goals and acceptance criteria, numbered, copied as written, each
   build-only goal marked with its ground. The critic judges each one.
6. The reference, when there is one: the screenshot of the app that a mockup rebuilds, or
   the approved canvas that a build must match.
7. The real UI references for the pattern, gathered by
   `<plugin-root>/references/ui-references.md`: each screenshot path with its product,
   why it fits and its link, and the source they came from. Every round gets the same set.
8. The cap, when the person set one in the brief.

Never send the builder's own opinion, a self-score, the time spent or the history of the
build. The critic judges what is on the screen.

When `Agent` cannot dispatch `ss:ss-design-critic`, run a `general-purpose` subagent whose
prompt opens with the body of `<plugin-root>/agents/ss-design-critic.md` below its
frontmatter, verbatim. Say so in one line. With no `Agent` tool at all, critique the
screenshots yourself against that file, and mark the round "self-judged" in the report.

## Scoped rounds and the full pass

Round 1 judges everything. After it, each round is **scoped**: the critic and every
checker judge only the screens or artboards changed since the last round, at full
resolution, plus every screen an open finding cites, with a contact sheet of everything
else for context (`<plugin-root>/scripts/render_canvas.py sheet` over a `shots.json` that
lists them). A finding the critic spots on the sheet is a finding like any other, and a
screen it needs in full goes in `missing`.

When a scoped round comes back pleased with every goal achieved and no checker finding
open, the next round is a **full pass**: every screen at full resolution, every task,
every width, as in round 1. Only a full pass can end the loop as pleased, so nothing
regresses unseen. A full pass that finds anything goes back to scoped rounds.

## Fix, then repeat

- **Fix every finding**, High, Medium and Low: the critic is pleased only when it would
  send nothing back. A finding that asks for a screenshot you did not send, and every
  `missing` entry, is fixed by taking it.
- **Fix in batches.** Group the round's findings that share a cause: the same token, the
  same component, the same pattern across screens. Fix each group in one change, at its
  cause, and list the groups in the round's report line, each with the finding numbers it
  closes. A finding that shares no cause is a group of one.
- **Close every goal** the critic marked `not_achieved`, from what it says is missing.
- **Refuse a finding only with a ground** the next critic can check: it contradicts the
  person's request or the design source, quoted. A refused finding goes to the next round
  with its ground.
- **End the round at a clean step**: commit the code that changed, or republish a canvas
  to its own URL, and write `state.json`.
- **Take new screenshots** of every task the fixes touched, then dispatch a fresh critic
  with the open findings, scoped or full by the section above.

## Convergence

After each round, count the open findings by severity, across every source the round
pooled, and add the total to the trend in `state.json`. Each round's line in the task list
and the report shows both: "round 3: 17 open (High 2, Medium 9, Low 6); trend 24, 28, 17".
A round that grows is normal when fixes surface states nobody asked for yet; the trend lets
the person see where it is heading and set a cap if they want one.

## When the loop stops

- **The critic is pleased and the goals are achieved**: `pleased` and `goals_achieved` are
  both true in the same round, and that round is a full pass. Done.
- **The usage window runs low**: stop at a clean step (committed or republished, pushed, reported), by
  `<plugin-root>/references/long-run.md`, and report where the loop stands.
- **The person set a cap in the brief** ("at most 3 design rounds") and it is reached.

Nothing else stops it. Without a cap the loop keeps going, round after round, however many
rounds that takes. A loop that stops before both verdicts are true reports the open
findings and the goals not achieved as they are, and never calls the interface done.

## Report

- **The two verdicts** of the last round, each goal with its status, and how many rounds
  ran, the last one a full pass when the loop ended pleased.
- **The fix groups** of each round, with the findings each one closed.
- **The trend**: open findings per round, by severity, first to last.
- **Carried to the build**: each build-only goal and each check the target kind could not
  reach, with its ground.
- **A board of the final screenshots**, by `<plugin-root>/references/show-for-review.md`,
  next to the before when the change edits an existing screen.
- **What is still open**, one line per finding with its severity, and the refusals with
  their grounds.
