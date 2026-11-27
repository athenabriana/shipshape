# Long runs: ask once, then run to the end

When the goal is clear, a session asks every open question once, at the start, and then
works without asking until the work is done or a real blocker stops it. This page states
that rule, what a real blocker is, and how a long run bounds itself: the plan's usage
window and the cap the person sets. A work session, a `/ss:go` run and a plain session all
follow it.

## When the rule applies

The rule applies when the goal is clear: the person said what done looks like, or the
brief carries the goal, the acceptance criteria and the endpoint. A request that still has
an open shape goes to `/ss:clarify` first, and the run starts once its goals are approved.

## Ask every open question once, at the start

Before the first edit, list every decision the work needs that the request, the brief, the
code and the repo's defaults leave open. Then ask them together:

1. **One decision sheet**, by `<plugin-root>/references/decision-sheet.md`, with every open
   question as one block and a default on each: the recommended pick first, its subtitle
   saying "Recommended" and why. A single open decision goes through the question tool.
   For big work, `/ss:clarify` writes a private Claude Docs doc first, by "When the goals
   get a doc" in `<plugin-root>/skills/clarify/references/goals-doc.md`, and the sheet follows it.
2. **Say the promise in the sheet's header line or the dialog**: after this, the session
   runs to the endpoint and asks again only on a real blocker.
3. **Take the answers as final for this run.** A decision the person skipped keeps its
   recommended pick only when they said "go with the defaults"; a plain **Skip** leaves it
   open, by "Read the answer" in the decision-sheet page.

Work that runs the goal loop of `<plugin-root>/references/goal-loop.md` adds the blocks
`/ss:clarify` proposes: the goals, numbered, each with its check, "Approve these goals" first,
and what is out of scope. Their approval
is the only time the goals are asked; after it they hold for the run.

UI work adds one block when the person has not already said: "Start on a mockup, or go
straight to the real screen?", the mockup first and recommended, by
`<plugin-root>/references/show-for-review.md`.

A question the session can answer from the code, the repo, the brief or a sensible
default is not an open question. Decide it, and name the decision in the final report
under "decided on my own".

In a work session the sheet travels to the orchestrator as one `ss.ask` JSON, by
`<plugin-root>/references/front-contract.md`. A brief that already answers every decision
needs no sheet: the session starts at once.

## Then run without asking

After the answers arrive, the session works step after step to the endpoint:

- **No check-ins.** It never asks "should I continue?", "want me to go on?" or "shall I
  start the next step?", and it never stops between steps to report progress. Progress is
  the task list and the final report.
- **Decide, then record.** A choice that comes up mid-run and is not a real blocker is
  decided by the session, on the brief's goal and the repo's conventions, and goes in the
  final report under "decided on my own", with the reason.
- **"Continue" means the next step.** When the person or the orchestrator says "continue",
  run the next step; do not recap what already ran.

## A real blocker

A _real blocker_ is something only the person can settle, or a permission the session
does not have. Nothing else stops a run. It is one of these:

- **A decision only the person can make**: a product choice, a scope change, a trade-off
  between two things they asked for, or anything the brief and the first sheet left open
  and the session cannot pick a safe default for.
- **A missing permission or access**: a denied tool call, a credential or secret the
  session needs and must not invent, a repo or service it cannot reach.
- **An action the hard rules reserve for the person's word**: a merge, a force-push, a
  deploy, a message posted where the person's rules require their ask.
- **A finding that the goal itself is wrong**: the work, done as asked, would break
  something the person cares about, and the session can show it.

A failing test, a red CI run, a flaky check, a review finding, a missing detail with a
sensible default, and a choice between two reasonable implementations are not blockers.
The session handles them and keeps going.

On a real blocker, ask that one question (a work session sends it to the orchestrator),
with what the session already tried and its recommended pick, then end the turn.

## Bound the run: usage budget and the person's cap

A long run stops on whichever comes first: the endpoint, a real blocker, the person's cap,
or the usage window running low. There is no time floor and no time estimate: the
"No time or effort estimates" rule of `<plugin-root>/hooks/operating-context.md` stands.

### The person's cap

The person can set a cap in the request or the brief, in their own words: "at most 3
review rounds", "stop after the PR is green", "one PR only", "no more than two design
rounds". A cap is a limit the person chose, never a guess about how long the work takes.
Copy it word for word into the brief and the todo list, and stop when it is reached, at a
clean step.

### The usage window

The run watches the plan's usage window with `mcp__ccd_session_mgmt__get_usage` (load it
with `ToolSearch` when it is deferred). Read it at the start and after each step that
finishes: a commit, a push, a review round, a design round.

- **Keep going** while the 5-hour window has room for the next step.
- **Stop at a clean step** when it does not: commit, push, write the state the next run
  needs (the todo list, the notes folder, the PR description), and send the report. Never
  leave a half-applied edit or an unpushed commit for the window to cut.
- **Keep the run's state durable.** Working files a later step needs (screenshots,
  generated files, a helper script, the state of a loop) live in the notes folder or
  `~/.ss/runs/<slug>/`, never the scratchpad, which a restart can clear. After a restart,
  a subagent that was cut off is resumed with `SendMessage` to its id before it is
  dispatched again.
- **Say the reset time** in the report, from `get_usage`'s `plan`, so the orchestrator can
  send "continue" after it.
- When `plan` is `not_applicable` or `unavailable`, the run is bounded by the endpoint, the
  cap and the blockers alone. Say so in one line in the report.

A clean step is one that leaves nothing half done: the work is committed, pushed when the
endpoint allows it, and reported.

## The final report

The report at the end of a long run carries:

- **The result** against the goal and the endpoint.
- **Where it stopped and why**: the endpoint, a real blocker, the cap, or the usage window
  (with its reset time).
- **Decided on my own**: every choice the session made without asking, one line each with
  the reason.
