---
status: in-progress
created: 2026-10-29
slug: orchestrate-entry
---

# Orchestrate as each project's entry point

`/ss:orchestrate` becomes the way a person works on a project: one conversation per project, where the person asks for things and the orchestrator delegates them. The fronts it opens run shape, build, review and ship, and the person may never see those skills run. Today the skills assume the person is in front of them: each one asks through `AskUserQuestion`, which in a side session reaches nobody, and the orchestrate skill still tells the person to skip it for a single task.

Success looks like a person who opens one orchestrator per project, asks for a fix, a feature or a question, and gets every decision, file and report in that conversation, with the side sessions running the ss skills underneath.

## The two sides of a front

A front is a side session the orchestrator opened with a brief. The brief says it is a front and names the orchestrator's session. Every ss skill reads that and changes one thing: where its questions go.

```
person ── AskUserQuestion ── orchestrator ── SendMessage ── front (/ss:shape, /ss:build, ...)
                                  ▲                              │
                                  └──────── SendMessage ─────────┘
                                   the question, its options and the recommended pick
```

The front sends the question with everything the dialog would have carried, and waits. The orchestrator asks the person through `AskUserQuestion` and sends the answer back quoted. Outside a front, nothing changes: the skill asks the person directly, as today.

## What the orchestrator does itself

Reads stay with the orchestrator; anything that writes code goes to a front, even a one-line change. A question about the project, a PR's state, a CI log, triage of what to do next: the orchestrator answers in place. This keeps the orchestrator's context on the project and off the code, at the cost of a session start for each small change.

## Decisions

- A skill knows it runs in a front because the brief says so and names the orchestrator's session. A plugin-level reference states the front's contract once, and shape, build, review and ship point to it.
- In a front, every question a skill would ask through `AskUserQuestion` goes to the orchestrator through `SendMessage`, with the options and the recommended pick written in the message, and the front waits for the answer.
- The orchestrator relays each question to the person through `AskUserQuestion` and sends the answer back in the person's words, quoted.
- Reads, answers about the project and triage stay with the orchestrator. Any change to code, even one line, goes to a front.
- `/ss:orchestrate` stops being "not for a single task": it is the entry point of a project, and a single request is a run with one front.
- At the start of a run, the orchestrator reads `.ss/wiki/entities/index.md` when the repo has one, so the briefs name the decisions that already govern the code a front touches.
- Every code front runs at the full scope by default: build, review and ship, up to a PR with green CI, with no merge. The brief states the scope, so `/ss:build` asks nothing; the person can ask for less in the request.
- Every front that writes code works in a worktree of its own. When `start_session` opens it without one, the front creates its own worktree before touching a file.
- No fixed cap on fronts at once. Above four fronts working at the same time, the orchestrator tells the person before it opens the next.
- A front that stops on the usage limit is resumed by the orchestrator after the reset: it tells the person the reset time in one line, and sends each stopped front a message to continue once the reset passes.
- A front that needs another front's result opens after that front's PR lands, or the orchestrator says why it opens earlier. PRs land in the order of what depends on what.
- A front publishes every page it produces (a board, a report, a design) as an Artifact and sends its URL to the orchestrator. The orchestrator opens it for the person at once, with the `Artifact` tool's `open` action. A local file (a screenshot, a video) reaches the person through `SendUserFile`.
- The person edits an artifact in the orchestrator's conversation. The orchestrator applies the edit itself, reading the artifact and publishing it again to the same URL, since an artifact is not the repo's code. An edit that needs the front's context or changes code goes back to the front.
- The orchestrator keeps no run log. A new orchestrator on the same project rebuilds the state from `list_sessions` and the open PRs.
- The brief names the ss skill a front runs, by the route: a bug runs `/ss:diagnose`, an idea that needs research runs `/ss:research` then `/ss:shape`, someone else's PR to adopt or bring up to date runs `/ss:takeover`, and a branch to read runs `/ss:review`'s loop. `/ss:caretake` only reads the repo, so the orchestrator runs it in place.

## Behavior

Happy path:

1. The person opens `/ss:orchestrate` in a project and asks for a feature.
2. The orchestrator reads the wiki catalog, opens one front with a brief that says it is a front, names the orchestrator's session, the scope (build, review, ship) and the skill route (`/ss:shape`).
3. `/ss:shape` in the front reaches a gray area and sends the question, its options and its pick to the orchestrator, then waits.
4. The orchestrator asks the person through `AskUserQuestion` and sends the answer back quoted.
5. The front finishes the spec, builds at the scope the brief set, opens the PR with green CI and reports.
6. The orchestrator checks the PR, tells the person in product words, and merges only when the person authorizes it.

| WHEN                                                        | THEN                                                                                  |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| the person asks a question about the project                | the orchestrator answers in place, with no front                                      |
| the person asks for a one-line change                       | a front opens for it                                                                  |
| a skill runs in a session with no front brief               | it asks the person through `AskUserQuestion`, as today                                |
| a front's skill reaches a decision                          | the question reaches the person through the orchestrator, never as a local dialog     |
| the person answers in free text                             | the front receives those words, quoted                                                |
| the front's message to the orchestrator fails               | the front stops idle with the question as its last message, for `list_events` to read |
| `start_session` opens a code front with no worktree         | the front creates its own worktree before touching a file                             |
| a fifth front would work at the same time                   | the orchestrator tells the person before opening it                                   |
| fronts stop on the usage limit                              | the person hears the reset time once; each front is told to continue after it         |
| front B needs front A's result                              | B opens after A's PR lands, or the orchestrator says why earlier                      |
| two PRs are green and one depends on the other              | the one depended on lands first                                                       |
| a front publishes an artifact                               | the orchestrator opens it for the person in the same turn the URL arrives             |
| the person asks to change an artifact                       | the orchestrator edits it and republishes to the same URL                             |
| an artifact edit needs code or the front's context          | the orchestrator sends it to the front, quoted                                        |
| the person asks for a build only                            | the brief sets that scope; the front stops at a green, committed branch               |
| a new orchestrator opens on a project with fronts running   | it rebuilds the state from `list_sessions` and the open PRs                           |
| the repo has no `.ss/wiki/`                                 | the orchestrator skips the catalog                                                    |
| the route names a skill that is not in the installed plugin | the brief names the closest skill that exists, and the orchestrator says so           |

## Attention points

- The question passage lives in several places: each skill's `SKILL.md`, `references/handoff-gate.md`, and `hooks/operating-context.md`, which tells every session to surface decisions through the question tool. A place left out keeps a front asking a dialog nobody sees.
- A front waiting for an answer is a side session that ended its turn; the orchestrator learns of it through `wake_when_done` or `notify_when_idle`, and a message that arrives while the front is mid-turn can be read late.
- Resuming after the reset needs the orchestrator awake at the reset time, which the session tools do not give; `ScheduleWakeup` exists only in loop mode.
- `start_session` creates no worktree when the session's folder is not a git repository, as when the orchestrator runs from a parent folder holding several repos.
- The route names `/ss:research`, `/ss:caretake` and `/ss:takeover`, which land with PRs #9 and #10; `/ss:caretake` and `/ss:takeover` replace `/ss:maintain-repo`.
- Shape, build, review, ship and `references/handoff-gate.md` are also changed by PRs #9 and #10, so the build runs on a `main` that carries them.

## Tasks

### The front's contract

- [x] **1. The front contract**: a plugin-level reference states how a session knows it is a front, how a skill sends a question to the orchestrator and waits, and what it reports; `hooks/operating-context.md` points to it. · verify: reading

### The two sides

- [ ] **2. The skills route their questions**: shape, build, review and ship, and `references/handoff-gate.md`, send every question through the front contract when the session is a front. · verify: reading
- [ ] **3. The orchestrator as entry point**: `orchestrate/SKILL.md` drops the single-task exclusion, keeps reads and sends code to fronts, reads the wiki catalog, names the updated skill route, and rebuilds the state from `list_sessions` and open PRs. · verify: reading
- [ ] **4. The brief and the run**: `references/briefs.md` carries the front marker, the orchestrator's session, the full scope by default and the worktree fallback; `relay.md` relays forwarded questions, opens and edits the fronts' artifacts, the usage limit and the warning above four fronts; `landing.md` lands in dependency order. · verify: reading

### Close

- [ ] **5. Versions and CI**: bump the version of every skill touched, format the touched files, and open the PR with green CI. · verify: CI

## Out of scope

- The README rewrite around the orchestrator: a run of its own after this lands.
- A run log or a state file for the orchestrator. _revisit_ if rebuilding from `list_sessions` loses decisions the person cares about.
- A queue or a hard cap on fronts at once.
- Building `/ss:diagnose`, `/ss:research`, `/ss:caretake`, `/ss:takeover` or the review loop: their own fronts own them.

## Open

Nothing.
