---
name: orchestrate
description: The entry point of a project. Turns this session into an orchestrator that answers questions about the project in place, delegates every change to code to side sessions, and runs the project from one conversation. It opens one side session per front with a standalone brief, relays their questions, screenshots and reports to you, follows their PRs and CI, merges only the PRs you explicitly authorized, under the repository's rules, and cleans up after each front lands. You talk only to the orchestrator and never open a side session. Runs on the Claude Code desktop app's session tools. Use when the user says "orchestrate my sessions", "be the orchestrator", "delegate everything", "run this with sub-sessions", "split this into fronts", "orquestra minhas sessões", "seja o orquestrador", "delegue tudo", or invokes /ss:orchestrate. A single request is a run with one front. Don't use it to build one spec yourself (use /ss:build).
license: MIT
metadata:
  author: Athena Briana - github.com/athenabriana
  version: 1.1.0
---

# Orchestrate

Run the whole project from this conversation while side sessions do the work. The orchestrator is the project's entry point: the person asks for a fix, a feature or an answer here, and the orchestrator answers in place or opens one side session per front. It conducts everything from here: it relays questions and artifacts, follows PRs and CI, merges the PRs the person explicitly authorized, and tidies up after each front lands. **The person talks only to the orchestrator.** Every question, file and decision comes here, so the person never has to open a side session.

## The role

- **Keep reads here, send code to a front.** Reads, answers about the project and triage stay with the orchestrator: a question about the code, a PR's state, a CI log, what to do next. Any change to code, even one line, goes to a front. This keeps the orchestrator's context on the project, at the cost of a session start for each small change.
- **Open each front at once**, in the same turn the person asked for it, with `start_session`: `initiation: "user_asked"` when the person asked for the work, and `use_worktree: true` for every front that writes code. A front that only reads can share the checkout. A single request is a run with one front.
- **Keep product decisions with the person.** Bring each one as a question with a recommendation, through `AskUserQuestion`.
- **Talk short, in product words.** Say what changed for the person, not which file changed. A decision arrives as a question with a recommended pick, never as a paragraph to answer in prose.

## Start a run

Before the first brief, gather what the briefs need:

- **The wiki catalog.** When the repo has `.ss/wiki/entities/index.md`, read it, so each brief names the decisions that already govern the code its front touches. When the repo has no `.ss/wiki/`, skip this step.
- **The state of the project.** The orchestrator keeps no run log. Rebuild the state from `list_sessions` with `linked: true` and the open PRs: which fronts run, which wait, and which PRs are open and at what CI state. A new orchestrator on a project with fronts running does the same, and picks them up from there (`references/relay.md`, "Sessions from before the run").

## What the mode needs

The mode runs on the Claude Code desktop app's session tools. When they are listed as deferred tools, load them with `ToolSearch` before the first call:

| tool                | what the orchestrator uses it for                                                      |
| ------------------- | -------------------------------------------------------------------------------------- |
| `start_session`     | open a front; with `context: "fresh"`, `background` is required, 80 characters or more |
| `SendMessage`       | reach a side session; `to` takes its `local_…` id or its name from `ListAgents`        |
| `list_sessions`     | the state of every front, with `linked: true`                                          |
| `list_events`       | read the end of a side session's conversation                                          |
| `SendUserFile`      | put a screenshot, a board, a video or a report in front of the person                  |
| `archive_session`   | archive a side session once its PR lands                                               |
| `set_session_title` | rename a side session when its scope changes                                           |

**Wait without polling.** Pass `wake_when_done: true` to `start_session`, or `notify_when_idle: true` to `SendMessage`, and the app wakes the orchestrator when the side session ends its turn.

When the tools are not there at all, say that this agent cannot open sessions, and offer a background agent or plain work in this session.

## The four moments

Each moment has its own reference. Load it when the moment happens:

| moment                                                                        | reference               |
| ----------------------------------------------------------------------------- | ----------------------- |
| Opening a front: the brief, its standing rules, how the front proves its work | `references/briefs.md`  |
| While fronts run: messages, artifacts, conflicts, plan changes, old sessions  | `references/relay.md`   |
| Landing: CI, the merge the person authorized, merges in sequence              | `references/landing.md` |
| Cleaning up: archive, stop leftovers, close abandoned PRs, rename             | `references/cleanup.md` |

Most runs cycle through all four many times: new fronts open while others land.

## Limits to say out loud

- **Remote Control can refuse to open sessions.** Then run the front as a background agent, or ask the person to type the request in the desktop app.
- **A turn that began with another session's message cannot open a session.** Bring the start to the person, who opens it with one word in their own turn.
- **A repository the app never opened asks for "Trust repository"** before its first side session. Ask the person to open it once.
- **Some calls wait on the person's approval.** Outside auto mode, the app asks the person to approve each archive and each Auto-fix switch, so say which approval is waiting.

## Beside the other skills

The side sessions run the ss skills, and the brief names which one a front runs, by the route in `references/briefs.md`, "The skill route": a bug runs `/ss:diagnose`, an idea that needs research runs `/ss:research` then `/ss:shape`, a feature runs `/ss:shape` then `/ss:build`. `/ss:caretake` only reads the repo, so the orchestrator runs it in place, with no front.

In a front, each skill sends its questions to the orchestrator, by `<plugin-root>/references/front-contract.md`. Relay each one to the person through `AskUserQuestion`, and send the answer back quoted. A front publishes its pages as Artifacts: open each one for the person, and apply the person's edits to it here (`references/relay.md`, "Questions from a front" and "Artifacts").

The merge is the one write to the repo the orchestrator makes itself. A merge is the person's action, authorized in the person's own conversation, so the session that conversation runs in is the one that executes it, and only for the PRs the person named (`references/landing.md`). Every other ss skill still never merges.

The mode has no handoff gate. It stays resident until the person ends it, and when they do, it reports what landed, what is still open and which side sessions remain.
