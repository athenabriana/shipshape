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
`AskUserQuestion`, or a decision sheet by `references/decision-sheet.md`, as it always
does.

## What a work session never does

- **It never starts a session.** It splits its work with `Agent` subagents. A step that
  needs another session (a watcher, a second task) goes to the orchestrator in the report.
- **It never opens the front.** The brief carries everything the task needs: the goal, the
  acceptance criteria, the repo, the branch, the endpoint and the limits. The front doc
  belongs to the orchestrator, which records what the work session reports.
- **It never merges on a relayed word.** Like any ss session, it merges a PR only when
  Athena says so in its own chat, under the repo's rules, and force-pushes or deploys only
  when she asks for it in so many words. An authorization given in the orchestrator's chat
  stays there.

## Write to the orchestrator in English

Every message a work session sends the orchestrator is English: its questions, its options
and its reports. The traffic between sessions is read by sessions, so it narrows the rule
of `references/doc-style.md` that a string the person reads follows their language.
Athena's words stay as she said them: quote the request and every answer exactly as the
brief and the orchestrator give them.

## Ask once, then run long

A work session asks every open question once, at the start, and then runs to its endpoint
without asking, by `<plugin-root>/references/long-run.md`:

- **At the start**, every decision the brief leaves open goes to the orchestrator in one
  `ss.ask` decision sheet, a default on each. A brief that answers everything needs none.
- **After the answers**, the session never sends "should I continue?" and never stops
  between steps. A choice that comes up mid-run is decided and listed in the report under
  "decided on my own".
- **It asks again only on a real blocker**, as that page defines it: a decision only Athena
  can make, a missing permission, or an action reserved for her word.
- **It bounds itself** by the cap the brief carries, in Athena's words, and by the plan's
  usage window: it stops at a clean step (committed, pushed, reported) before the window
  runs out, and puts the reset time in the report.

## Send each question to the orchestrator

In a work session, every question a skill would ask through `AskUserQuestion` goes to the
orchestrator through `SendMessage`, to its `local_…` id. That includes the mid-skill
questions and the handoff gate of `references/handoff-gate.md`. The message carries what
the dialog would have carried, since Athena reads it through the orchestrator's dialog:

- **The question**: what is being decided and why it is open.
- **The visual**, when the question asks for a review or an approval: the link to the
  page, the doc or the file that shows it.
- **Every option**: its label, what that pick does next, and what it costs.
- **The recommended pick**, named as such, first in the list.

At most four questions go in one message. A setting that goes with a question, like the
scope that goes with a handoff gate's pick, travels in the same message.

A decision sheet (`references/decision-sheet.md`) is never drawn here: its decisions go in
the message as one `ss.ask` JSON with `sections`, each with its `context`, as that page
defines. The orchestrator draws the sheet and sends back Athena's answer line, quoted.

After sending, end the turn and wait. The orchestrator asks Athena word for word and sends
the answer back quoted. Act on those words as the answer to the dialog: a pick names an
option, and free text is her own answer.

A proposed project fact travels the same way, as the exact line
(`references/project-facts.md`). Write it only after her yes, in your own branch.

## When the message fails

When `SendMessage` to the orchestrator fails, stop idle with the question, its options and
the recommended pick as your last message. The orchestrator reads it from `list_events`
and relays it from there, and its answer reaches the work session as a new message.

## Review before done

A work session whose endpoint is a PR never reports it done, or ready to merge, on green CI
alone. Once CI is green, it runs the `/ss:review` loop on its own PR, at the depth
`<plugin-root>/references/review-gate.md` picks (deep for tokens, secrets, auth,
permissions, servers or money, standard otherwise, said in one line). It fixes or refuses
what the judge finds, pushes, follows CI to green again, and lets the loop write its
verdict line into the PR description. On a PR that changes UI, the design loop on
screenshots of the built screen runs too, until the critic is pleased and the goals are
achieved, and its `Design:` line goes in the PR description under the verdict line.

A commit after the loop, a CI fix or a thread fix, makes the verdict stale. Run the loop
again on the delta before reporting. When the orchestrator sends a PR back for a review
round, run the loop on its latest head and report the new verdict.

## Report to the orchestrator

When the task ends, at done or at a blocker, send the orchestrator one message with:

- **The result**: what changed, in the words of the goal the brief set.
- **The goals**: the `Goals:` line of `<plugin-root>/references/goal-loop.md`, each goal
  of the brief achieved, open with what is missing, or deferred with its ground. The task
  is done only when every one is achieved or deferred.
- **The PR url**, when there is one, and the state of its CI.
- **The review verdict**, when there is a PR: the `Review:` line of
  `<plugin-root>/references/review-gate.md`, with the rounds, the verdict, the goal status,
  the depth, the fixed and refused counts, and the head sha the last round read. A PR with no verdict is
  reported as not ready to merge, with the reason.
- **The blockers**: what stopped the task, and what it takes to unblock it.
- **Where it stopped and why**: the endpoint, a real blocker, the brief's cap, or the usage
  window, with the reset time.
- **Decided on my own**: each choice made without asking, one line each with the reason.
- **Anything that needs another session**, such as a PR watcher, with what it should do.

## Pages and files

Athena sees what the work session produces through the orchestrator. A question that asks
her to review or approve something carries a visual of it, built before the question, in
the form `<plugin-root>/references/show-for-review.md` picks. A work session has no chat
with her, so the visual travels as a file in the notes folder or a link, and the
orchestrator shows it inline.

- **A page** (a board, a report): publish it as an Artifact and send its URL to the
  orchestrator, which opens it for her. A mockup goes on a canvas, as the next section says.
- **A local file** (a screenshot, a video): leave it in the notes folder the brief names
  and send its path. The orchestrator puts it in front of her with `SendUserFile`.

Edits to a published artifact belong to the orchestrator: it reads the artifact and
publishes it again to the same URL. An edit that needs code or the work session's context
comes back as a message, with Athena's words quoted. Apply it, republish to the same URL,
and send the URL again.

Feedback arrives as a concrete checklist item with Athena's words quoted beside it, by
"Feedback with a target" in `<plugin-root>/references/voice.md`. Work from the item. When
a relayed line names no target ("I don't like it"), describe what you built in one or two
lines and send one decision-sheet question back, the most likely reading as the pick,
before changing anything.

## A mockup first, or the real screen

UI work starts on a mockup or on the real screen, by Athena's pick, as "A mockup first, or
the real screen" in `<plugin-root>/references/show-for-review.md` says. When the brief does
not say which, the question goes in the opening `ss.ask` sheet: "Start on a mockup, or go
straight to the real screen?", the mockup first and recommended.

- **On the mockup path**, take screenshots of the running app, rebuild the screen on a
  Design canvas faithful to it, and have the critic confirm the match before designing the
  change. Run the design-review loop on the canvas, then send the canvas URL to the
  orchestrator with what each artboard shows and why A is the pick, and wait. Each change
  comes back with Athena's comment quoted: apply it on the same canvas, republish to the
  same URL, and send the URL again. Write the code only after she approves a version, then
  screenshot the built screen and have the critic check it matches the approved canvas.
- **On the real-screen path**, build in the app directly.

Either way, check the result on screenshots of the running thing and run the
design-review loop of `<plugin-root>/references/design-loop.md` until the critic is pleased
and the goals are achieved, before reporting done.
