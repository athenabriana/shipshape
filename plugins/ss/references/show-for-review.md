# Show it for review: a visual before every review ask

Every time ss asks the person to review, approve or pick something they need to see, it
shows that thing visually first, then asks. This page states the rule, which form to pick
for what is being reviewed, how interface work is checked on screenshots, how to find each
tool, and what to do when no visual tool is there. Every skill that asks for a review or an
approval follows it, in every session: a plain session, an orchestrator, and a work session.

## The rule

- **Build the visual before the question.** The question names what the visual shows and
  carries its link, because the person answers from the dialog
  (`<plugin-root>/references/handoff-gate.md`).
- **Never only a text dump or a bare file path.** A path is where the thing lives, not a
  way to see it. A long block of text pasted into chat is not a review surface either.
- **Show a change as a before and after.** The old version next to the new one, with what
  changed marked: two artboards, two columns, or the old line above the new one.
- **Keep it small enough to take in at once.** Show what the decision rests on, and link
  the rest.

## Only `/ss:clarify` creates a Claude Docs doc

A Claude Docs doc is created by `/ss:clarify` alone: a goals doc for big work, and the
orchestrator's front doc. Every other skill asks with the question tool or a decision
sheet, shows with an inline visual, a Design canvas or an Artifact page, and calls
`/ss:clarify` when the work needs a doc. The orchestrator updates its front doc and creates
none.

## Open every document in the chat

Every time a document (a Claude Docs doc, a Design canvas or an Artifact page) is created,
updated or relied on, the session in chat with the person opens it with the `Artifact`
tool's `open` action in the same turn, and says in one line what it holds. That covers a
doc a plan or a set of PRs is built from, not only one put up for review. A pasted link
alone is not enough: the person sees only what is opened in front of them. The one
exception is a doc the session updates as routine: an orchestrator's front doc, its own
memory, which opens once when the front is created
(`<plugin-root>/references/front-doc.md`), and a goals doc, which opens when clarify
creates it and again with the loop's report, not on each round's status update.

When a work session reports a doc or canvas URL, the orchestrator opens it before it
relays any question about it. A work session has no chat, so it sends the URL with its
one line, and the orchestrator opens it.

## Pick the form by what is being reviewed

The default is an inline visual in the chat: a flat diagram, a card grid, a before and
after drawn with `mcp__visualize__show_widget`. It shows the thing where the person is
already reading, so use it for any review or decision unless one of the other rows fits.

| what is reviewed                           | form                                       | how to make it                              |
| ------------------------------------------ | ------------------------------------------ | ------------------------------------------- |
| anything that fits on one screen (default) | an inline visual in the chat               | `mcp__visualize__show_widget`               |
| an interface                               | a mockup canvas, or screenshots of the app | `Artifact` `quickstart`, `intent: "design"` |
| goals and decisions to keep, for big work  | a private Claude Docs doc, opened for them | `/ss:clarify`, the only skill that makes it |
| decisions bigger than one quick pick       | a decision sheet                           | `mcp__visualize__show_widget`               |
| something too big to show inline           | an Artifact page                           | `Artifact` `quickstart`, `intent: "other"`  |

- **Anything that fits on one screen** is a flow, an architecture, a diff summary, a
  choice between options, a line to write, a setting. Draw it inline, then ask.
- **An interface** is a screen, a component, or a flow the person clicks through. It goes
  on a mockup canvas or straight to the real screen, by the person's pick, as the next
  section says.
- **Goals and decisions to keep** are a plan, a spec or acceptance criteria for big work,
  by "When the goals get a doc" in
  `<plugin-root>/skills/clarify/references/goals-doc.md`. Clarify writes the doc, and an inline
  visual can sum it up next to the question. A report or a draft from any other skill goes
  to the caller's path or the chat, shown inline or on an Artifact page.
- **Decisions bigger than one quick pick** are asked in one decision sheet, by
  `<plugin-root>/references/decision-sheet.md`: each question with one context line
  under it, all in one inline form. It replaces writing a doc and then asking separately.
  A doc stays the form for text to keep and edit.
- **Something too big to show inline** is a board of many screenshots, a dashboard, a
  report with many findings. It goes on a page, and an inline visual can sum it up next
  to the question.

## A mockup first, or the real screen

UI work starts on a mockup or on the real screen, and the person picks which. When they
have not said, ask it once, in the opening decision sheet of
`<plugin-root>/references/long-run.md`: "Start on a mockup, or go straight to the real
screen?", with the mockup first, recommended. When they already said, do not ask.

### The mockup path

The mockup is a Design canvas: the Artifact type for visual designs, which the person
comments on artboard by artboard. It has to be close to the app, so it starts from the
app itself.

1. **Gather real references** for the pattern, Inspo first, by
   `<plugin-root>/references/ui-references.md`, and put them on a "References" artboard.
   Then take screenshots of the running app for an existing screen, through the browser or
   app tools, by the next section.
2. **Rebuild that screen on the canvas** as closely as you can: the app's real tokens,
   type, spacing, components and copy. Create the canvas with the `Artifact` tool's
   `quickstart` action, `intent: "design"`, and publish from the type it names. Put the
   screenshot beside the rebuild, on an artboard labeled "Before".
3. **Check the match first.** The `ss-design-critic` agent compares the rebuild against the
   screenshot, by `<plugin-root>/references/design-loop.md`, and the rebuild is fixed until
   the critic finds it faithful. Only then is a change designed on top. A new screen has no
   screenshot: build it from the app's existing tokens and components, so it looks like it
   belongs.
4. **Design the change** next to the faithful rebuild: one variation per artboard, two
   wherever there is a choice, labeled A and B, the recommended one A on the first
   artboard with a label that says it is the pick.
5. **Run the design-review loop on the canvas** until the critic is pleased and the goals
   are achieved, then ask through the question tool, or a decision sheet by
   `<plugin-root>/references/decision-sheet.md`, with the canvas link, what each artboard
   shows and why A is the pick. Then wait.
6. **Iterate on the same canvas** with each change the person asks for, from their
   comments on the artboards, running the loop again on what changed. Republish to the same
   URL and ask again.
7. **Write the code only after the person approves a version**, and build that one. Then
   take screenshots of the real result and run the loop once more with the approved canvas
   as the reference: the critic checks the built screen matches it.

In a work session, steps 5 and 6 run through the orchestrator by
`<plugin-root>/references/front-contract.md`: send the URL with what each artboard shows,
and each change comes back with Athena's comment quoted.

### The real-screen path

Gather real references first, by `<plugin-root>/references/ui-references.md`, then build
the change in the app directly. It is still checked on screenshots of the running
thing and goes through the design-review loop, by the next section, until the critic is
pleased and the goals are achieved.

## Interface work is checked on screenshots

Any UI change is checked on screenshots of the running thing, never only by reading code.
Run it in an isolated instance and capture it through the browser or app tools available:
Claude in Chrome, the built-in browser, the `run` skill, or the app's own screenshots.
Capture each task a user does, step by step, with the states it passes by, at a desktop
and a phone width. Then run the design-review loop of
`<plugin-root>/references/design-loop.md`: the `ss-design-critic` agent judges the
screenshots, the session fixes what it finds, and the loop repeats until the critic is
pleased and the goals are achieved. Only the usage window or a cap the person set stops it
sooner.

The review ask for a UI change shows those screenshots: a board of the final screens, the
"Before" next to each changed one, and the critic's last verdict. When no tool could
render the interface, say so in one line, and never present a code reading as a visual
check.

## Find the tools

The visual tools are often deferred. Load each one with `ToolSearch` before its first
call, and search before saying a tool is missing:

- **`Artifact`**: query `select:Artifact`. Its `quickstart` action, with the `intent` from
  the table, names the type to start from and the design guidance to load. A page or a
  canvas it publishes is private.
- **The Docs tools**, for `/ss:clarify` and the orchestrator's updates: search by bare
  name (`create`, `batch`, `update`, `read`, `guide`), because their full names carry a
  server prefix. Call `guide` with `topic.instructions` before the first write. Open the
  doc for the person with the `Artifact` tool's `open` action.
- **The inline visual tool**: `mcp__visualize__show_widget`, the default form. Call
  `mcp__visualize__read_me` first, once per session, then draw. It shows in this
  conversation only.
- **A rendered file**: `SendUserFile` with `display: "render"` puts a Markdown, HTML, SVG
  or image file in the side panel.

## When no visual tool is there

When `mcp__visualize__show_widget` is missing, use the next form that fits from the table.
When none of the tools is there, write the review as a Markdown file in the session's folder: tables, a Mermaid diagram for
a flow, the before and after as two fenced blocks. Send it with `SendUserFile`,
`display: "render"`, and say in one line which visual tools were missing. Then ask.

## In a work session

A work session has no chat with Athena: the visual reaches her through the orchestrator,
so it travels as a file or a link. Write it as an SVG or HTML file in the notes folder, or
publish it as an Artifact page or a canvas by the table (a doc only through
`/ss:clarify`). The message to the
orchestrator carries the path or the link next to the question, by
`<plugin-root>/references/front-contract.md`. The orchestrator shows it to Athena inline
with `mcp__visualize__show_widget`, or opens the page, the doc or the canvas for her,
before it relays the question.

## Keep it private

Docs and Artifacts stay private. Never share one and never change its sharing. Write no
secret, token or credential into one: a value that has to appear is shown masked.
