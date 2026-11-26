# Show it for review: a visual before every review ask

Every time ss asks the person to review, approve or pick something they need to see, it
shows that thing visually first, then asks. This page states the rule, which form to pick
for what is being reviewed, how to find each tool, and what to do when no visual tool is
there. Every skill that asks for a review or an approval follows it, in every session: a
plain session, an orchestrator, the manager and a work session.

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

## Pick the form by what is being reviewed

The default is an inline visual in the chat: a flat diagram, a card grid, a before and
after drawn with `mcp__visualize__show_widget`. It shows the thing where the person is
already reading, so use it for any review or decision unless one of the other rows fits.

| what is reviewed                           | form                                       | how to make it                              |
| ------------------------------------------ | ------------------------------------------ | ------------------------------------------- |
| anything that fits on one screen (default) | an inline visual in the chat               | `mcp__visualize__show_widget`               |
| an interface                               | a Design canvas                            | `Artifact` `quickstart`, `intent: "design"` |
| text people will comment on or keep        | a private Claude Docs doc, opened for them | the Docs tools                              |
| something too big to show inline           | an Artifact page                           | `Artifact` `quickstart`, `intent: "other"`  |

- **Anything that fits on one screen** is a flow, an architecture, a diff summary, a
  choice between options, a line to write, a setting. Draw it inline, then ask.
- **An interface** is a screen, a component, or a flow the person clicks through. It goes
  on a canvas by the next section.
- **Text people will comment on or keep** is a plan, acceptance criteria, a research
  report, a README draft. It goes in a doc, and an inline visual can sum it up next to
  the question.
- **Something too big to show inline** is a board of many screenshots, a dashboard, a
  report with many findings. It goes on a page, and an inline visual can sum it up next
  to the question.

## Designs go on a canvas

An interface change shows its design before any code, on a Design canvas: the Artifact
type for visual designs, which the person comments on artboard by artboard.

1. Create it with the `Artifact` tool's `quickstart` action, `intent: "design"`, and
   publish from the type it names.
2. Put one variation per artboard, two wherever there is a choice, labeled A and B. The
   recommended one is A, on the first artboard, and its label says it is the pick. A
   change to an existing screen puts the current screen on its own artboard, labeled
   "Before".
3. Ask through the question tool, with the canvas link, what each artboard shows and why
   A is the pick. Then wait.
4. Apply each change the person asks for, from their comments on the artboards, on the
   same canvas. Republish to the same URL and ask again.
5. Write the code only after the person approves a variation, and build that one.

In a work session, steps 3 and 4 run through the orchestrator by
`<plugin-root>/references/front-contract.md`: send the URL with what each artboard shows,
and each change comes back with Athena's comment quoted.

## Find the tools

The visual tools are often deferred. Load each one with `ToolSearch` before its first
call, and search before saying a tool is missing:

- **`Artifact`**: query `select:Artifact`. Its `quickstart` action, with the `intent` from
  the table, names the type to start from and the design guidance to load. A page or a
  canvas it publishes is private.
- **The Docs tools**: search by bare name (`create`, `batch`, `update`, `read`, `guide`),
  because their full names carry a server prefix. Call `guide` with `topic.instructions`
  before the first doc. Open the doc for the person with the `Artifact` tool's `open`
  action.
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
publish it as an Artifact page, a Docs doc or a canvas by the table. The message to the
orchestrator carries the path or the link next to the question, by
`<plugin-root>/references/front-contract.md`. The orchestrator shows it to Athena inline
with `mcp__visualize__show_widget`, or opens the page, the doc or the canvas for her,
before it relays the question.

## Keep it private

Docs and Artifacts stay private. Never share one and never change its sharing. Write no
secret, token or credential into one: a value that has to appear is shown masked.
