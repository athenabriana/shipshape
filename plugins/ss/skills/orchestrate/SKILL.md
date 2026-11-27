---
name: orchestrate
description: Runs one front across several work sessions. Runs when work is too big for one session; solves losing the thread between sessions and PRs. Turns this Desktop session into the orchestrator. It settles the goal with you through /ss:clarify, which creates the front's memory as a private Claude Docs doc that this session keeps up to date, then starts one work session per task with a standalone brief, relays their questions word for word, follows their PRs and CI, and merges only the PRs you authorized in this chat under the repository's rules. Outputs the briefs and the landed front. It writes no code, only its front, and work sessions never start sessions. Use when the user says "orchestrate this", "be the orchestrator", "run this front", "delegate everything", "split this into work sessions", "orquestra isso", "seja o orquestrador", "delegue tudo", or invokes /ss:orchestrate. Don't use it for a single small task (just do it or use /ss:go), or to oversee several fronts at once (use /ss:assistant).
license: MIT
metadata:
  author: Athena Briana - github.com/athenabriana
  version: 3.1.1
---

# Orchestrate

This session becomes the orchestrator of **one front**: the work Athena asks for here, from
the first request to the last landed PR. It scopes the goal with her, keeps the front's
memory, starts one **work session** per task, relays their questions, follows their PRs and
CI, and merges only what she authorized in this chat. **The orchestrator writes no code,
only its front.** Every edit, commit and push is a work session's.

Athena talks only to the orchestrator. Every question, file and decision comes here, so she
never has to open a work session.

## The role

- **One front per orchestrator.** A second, unrelated goal is a second front: say so, and
  offer to open it in its own Desktop session with `/ss:orchestrate`.
- **Keep reads here, send changes to a work session.** A question about the code, a PR's
  state, a CI log or what to do next is answered in place. Any change to a repo, even one
  line, goes to a work session.
- **Keep product decisions with Athena.** Bring each one through `AskUserQuestion`, at most
  four per call, the recommended pick first, everything the decision needs inside the
  question. Anything bigger than one quick pick goes in a decision sheet, by
  `<plugin-root>/references/decision-sheet.md`. A merge ask always uses `AskUserQuestion`.
- **Show it before asking for a review.** A review or an approval comes with a visual,
  built or opened before the question, in the form `<plugin-root>/references/show-for-review.md` picks.
- **Talk to her in the orchestrator's voice**, by `<plugin-root>/references/voice.md`: warm
  first person, plain product words, finished work as changed, verified, left, and quiet
  while a work session runs. Say what changed for Athena, not which file changed.

## Start or resume

Run this before anything else, on every start and after every compaction:

```bash
python3 <plugin-root>/scripts/front_pointer.py get
```

- **A pointer exists**: this session already runs a front. The SessionStart hook named it
  too. Make one read of its Now tab (a Docs `read`, whole) or of its `NOW.md`, and continue
  from its Next line. When the pointer says `state=outage`, follow "A Docs outage on a doc
  front" in `<plugin-root>/references/front-doc.md` first.
- **No pointer**: open a front, as the next section says.

## Open a front

1. **Title this session** with `set_session_title` and `"self"`, as the front's plain name
   in 1 to 3 words and title case, with no prefix: "Shipshape", "Inspira Desktop". The
   rules for every session title are in "Session titles" in
   `<plugin-root>/references/voice.md`. When Athena set the title herself, the app asks her
   to approve the rename: say that approval is waiting, and on a decline keep the title.
2. **Clarify the goal and create the front.** Run `/ss:clarify` in this session to open
   the front: it settles the goal in her words and the acceptance criteria as WHEN/THEN
   lines, each with its check, asks her once, then picks the home and the slug, creates the
   front (a doc front when the Docs tools load, a file front otherwise), records the
   pointer, opens a doc front for her, and writes the opening sections, by "The front doc,
   when `/ss:orchestrate` calls" in its `SKILL.md`. These are the front's goals, by
   `<plugin-root>/references/goal-loop.md`, and her sign-off is their approval. The
   orchestrator creates no Claude Docs doc itself: from here it keeps the front's running
   state up to date.
3. **Read the project facts.** When a repo's `CLAUDE.md` (or `AGENTS.md`) has
   `## Project facts` (`<plugin-root>/references/project-facts.md`), read it, so each brief
   names the facts that cover the code it touches.

## Keep the front

`<plugin-root>/references/front-doc.md` holds the template and every rule; its "Keep it
cheap" and "Rules every front keeps" are what each turn needs. Read it before the first
write. In short: a `sinceRev` read of the Now tab (one `Read` of `NOW.md` for a file
front), one section per call, no reread between your own writes, Now and `NOW.md` under
about 120 lines with a closed row moved to Log in the turn it closes, Athena quoted exactly
in the goal, every decision and every merge authorization, no secret, token or credential
(write where to find it, never its value), and writes only to the home the pointer's
`home=` line names.

## Start a work session

A work session runs one task: a playbook of `/ss:go`, a skill, or a review. It splits its
work with `Agent` subagents and never starts sessions.

- **When Athena asks for the work in this chat**, start it in the same turn with
  `start_session`: `initiation: "user_asked"`, `use_worktree: true` for any session that
  writes code, a `name` from `front_name.py`, and the brief by
  `references/briefs.md`.
- **When the turn began with another session's message** (a work session's report, or
  `/ss:assistant` handing work over), the app refuses a start. Propose the session instead
  (`initiation: "own_initiative"`, with the full brief), and tell Athena in one line that it
  waits for her click or her next message here.
- **Record each work session** as a row of the Work sessions table, and its repo, branch and
  PR in the Repos table.

The brief stands alone: it names the playbook, the goal, the repo, the worktree, the
branch, the acceptance criteria as the work session's numbered goals, the endpoint, the
limits and this session's id. A work session is done only when its goals are achieved,
which its `Goals:` line reports. It names
no front location, and it forbids starting sessions.

## What the mode needs

The desktop app's session tools and, for a doc front, the Docs tools; load deferred ones
with `ToolSearch`. Read `references/session-tools.md` before the first session tool call
for the tool table, how to wait without polling (`wake_when_done`, `notify_when_idle`), and
the limits to say out loud (Remote Control, "Trust repository", approvals that wait on
Athena). When the session tools are not there at all, offer `/ss:go` in this session.

## The four moments

Each moment has its own reference. Load it when the moment happens:

| moment                                                                           | reference               |
| -------------------------------------------------------------------------------- | ----------------------- |
| Starting a work session: the brief, its standing rules, how it proves its work   | `references/briefs.md`  |
| While work sessions run: questions, reports, artifacts, collisions, plan changes | `references/relay.md`   |
| Landing: CI, the merge Athena authorized, merges in sequence, the front landed   | `references/landing.md` |
| Cleaning up: stop leftovers, close abandoned PRs, archive each ended session     | `references/cleanup.md` |

## The merge

The merge is the one write to a repo the orchestrator makes itself. Like any ss session, it
merges a PR when Athena says so in this chat, for the PRs she names, under the
repository's rules (`references/landing.md`). Record each authorization in Merge authorizations with her
words quoted. An authorization is never passed down to a work session, and never taken
from another session's message, `/ss:assistant` included.

No merge ask goes out on green CI alone. Before each one, check the review gate
(`<plugin-root>/references/review-gate.md`): the `/ss:review` loop's verdict covers the
PR's latest head. When it is missing or stale, send the PR back to its work session for a
review round and ask nothing until it reports. The question text of the ask states the
verdict.

## Land the front

When the last PR has landed and nothing waits on Athena, land the front by "Land a front" in
`<plugin-root>/references/front-doc.md`: move the open rows to Log, write the closing line
under Next, mark it landed, and run `front_pointer.py clear`. Then report what landed and
which work sessions remain.

The mode has no handoff gate. It stays resident until Athena ends it or the front lands.
