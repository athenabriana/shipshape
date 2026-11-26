# Work session contract: how a skill runs in a work session

A _work session_ is a session `/ss:orchestrate` started with a brief, to run one task of a
front. Athena talks only to the orchestrator, so in a work session every question, every
page and every report reaches her through it. This page states what changes in a work
session: how a session knows it is one, what it never does, how its questions travel, what
it reports, and where its pages and files go. Every ss skill follows it.

## Know you are a work session

A session is a work session when its brief says so and names the orchestrator's session
id, the `local_…` id `SendMessage` takes in `to`. Read the brief once, at the start, and
keep that id for every message below.

Without such a brief, nothing on this page applies: the skill asks through
`AskUserQuestion`, as it always does.

## What a work session never does

- **It never starts a session.** It splits its work with `Agent` subagents. A step that
  needs another session (a watcher, a second task) goes to the orchestrator in the report.
- **It never opens the front.** The brief carries everything the task needs: the goal, the
  acceptance criteria, the repo, the branch, the endpoint and the limits. The front doc
  belongs to the orchestrator, which records what the work session reports.
- **It never merges, approves or deploys.** The merge is the orchestrator's, on Athena's
  authorization given in the orchestrator's chat.

## Write to the orchestrator in English

Every message a work session sends the orchestrator is English: its questions, its options
and its reports. The traffic between sessions is read by sessions, so it narrows the rule
of `references/doc-style.md` that a string the person reads follows their language.
Athena's words stay as she said them: quote the request and every answer exactly as the
brief and the orchestrator give them.

## Send each question to the orchestrator

In a work session, every question a skill would ask through `AskUserQuestion` goes to the
orchestrator through `SendMessage`, to its `local_…` id. That includes the mid-skill
questions and the handoff gate of `references/handoff-gate.md`. The message carries what
the dialog would have carried, since Athena reads it through the orchestrator's dialog:

- **The question**: what is being decided and why it is open.
- **Every option**: its label, what that pick does next, and what it costs.
- **The recommended pick**, named as such, first in the list.

At most four questions go in one message. A setting that goes with a question, like the
scope that goes with a handoff gate's pick, travels in the same message.

After sending, end the turn and wait. The orchestrator asks Athena word for word and sends
the answer back quoted. Act on those words as the answer to the dialog: a pick names an
option, and free text is her own answer.

A proposed project fact travels the same way, as the exact line
(`references/project-facts.md`). Write it only after her yes, in your own branch.

## When the message fails

When `SendMessage` to the orchestrator fails, stop idle with the question, its options and
the recommended pick as your last message. The orchestrator reads it from `list_events`
and relays it from there, and its answer reaches the work session as a new message.

## Report to the orchestrator

When the task ends, at done or at a blocker, send the orchestrator one message with:

- **The result**: what changed, in the words of the goal the brief set.
- **The PR url**, when there is one, and the state of its CI.
- **The blockers**: what stopped the task, and what it takes to unblock it.
- **Anything that needs another session**, such as a PR watcher, with what it should do.

## Pages and files

Athena sees what the work session produces through the orchestrator:

- **A page** (a board, a report): publish it as an Artifact and send its URL to the
  orchestrator, which opens it for her. A design goes on a canvas, as the next section says.
- **A local file** (a screenshot, a video): leave it in the notes folder the brief names
  and send its path. The orchestrator puts it in front of her with `SendUserFile`.

Edits to a published artifact belong to the orchestrator: it reads the artifact and
publishes it again to the same URL. An edit that needs code or the work session's context
comes back as a message, with Athena's words quoted. Apply it, republish to the same URL,
and send the URL again.

## Designs go on a canvas

An interface change shows its design before any code, on a Design canvas: the Artifact
type for visual designs, which Athena comments on artboard by artboard.

1. Create it with the `Artifact` tool's `quickstart` action, `intent: "design"`, and
   publish from the type it names.
2. Put one variation per artboard, two wherever there is a choice, labeled A and B. The
   recommended one is A, on the first artboard, and its label says it is the pick.
3. Send the URL to the orchestrator, in one message with what each artboard shows and why
   A is the pick, then wait.
4. Each change Athena asks for comes back quoted, from her comments on the artboards. Apply
   it on the same canvas, republish to the same URL, and send the URL again.
5. Write the code only after she approves a variation, and build that one.

Outside a work session the steps are the same, with the person reading the canvas and
commenting directly.
