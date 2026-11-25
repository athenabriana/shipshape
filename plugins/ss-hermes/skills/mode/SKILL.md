---
name: mode
description: Ship Shape's rigor mode for Hermes. Reads the request, matches it to one playbook (investigate, bug-fix, review, ship, edge-cases), sizes the process to the risk with a lightweight, standard or intensive route, tracks the steps on a worklist and runs each step's skill. Sticky once entered, it stays on across turns until the person opts out. Use when the user types /ss:mode, says "use ss", "be rigorous", "do this properly", or starts any non-trivial engineering task. Don't use it for a tiny mechanical change (just do it) or for a question about Hermes itself.
license: MIT
metadata:
  author: Athena Briana - github.com/athenabriana
  version: 0.2.0
---

# ss mode

One entry point. Match the request to a playbook, size the route, run the steps.

## 1. Match a playbook

| Playbook    | Pick it when                                                                         | Load             |
| ----------- | ------------------------------------------------------------------------------------ | ---------------- |
| investigate | a read-only question about the code, a branch or its history: how, why, what changed | `ss:investigate` |
| bug-fix     | a defect, an error, a stack trace, "this fails"                                      | `ss:bug-fix`     |
| review      | judge a diff: the current branch, or a PR by number                                  | `ss:review`      |
| ship        | land a branch: push, open or finish a PR, green CI, watch it                         | `ss:ship`        |
| edge-cases  | "what could break", "edge cases": before coding (plan) or on a diff                  | `ss:edge-cases`  |

Before coding anything non-trivial, `ss:edge-cases` in plan mode turns the request into
WHEN/THEN acceptance criteria. Offer it when the expected behavior is not already written down.

If none fits, say which one is closest and why it falls short, then do the work by hand under
the rules in section 3. Coming next, not yet in this version: feature, refactor, shape,
takeover, pause/resume, caretake.

If two playbooks fit, ask with `clarify`, recommended choice first. A request for a whole
flow ("fix it and ship it") is one playbook with its scope set: run bug-fix, then ship,
without asking again between them.

## 2. Size the route

Bug-fix work, and later feature and refactor work, records five facts before it changes code:

- **blast radius:** low, medium or high. Who calls this, and how far does a mistake travel?
- **reversible:** yes or no. A migration, a sent message or a deleted record is no.
- **data or auth:** does it touch stored data, permissions or secrets?
- **coverage:** good, some or none. Are there tests near the code that changes?
- **files:** how many files the change will likely touch.

Then run:

```
python3 <plugin-root>/scripts/route.py --blast-radius <low|medium|high> --reversible <yes|no> \
  --data-or-auth <yes|no> --coverage <good|some|none> --files <n>
```

| Route       | Gates                                                                                                 |
| ----------- | ----------------------------------------------------------------------------------------------------- |
| lightweight | preservation check, mechanical gate, the review loop with only the correctness front, then `ss:ship`  |
| standard    | mechanical gate, `ss:review` in its default loop, then `ss:ship`                                      |
| intensive   | a blast-radius pass over callers first, `ss:edge-cases` on the diff, `ss:review deep`, then `ss:ship` |

"Keep it light" or "be thorough" from the person overrides the script. Say which route you
are on and why, in one line.

**Mechanical gate:** the cheap, objective checks come before any review. Let the repo's
pre-commit hooks run on commit. Run no test suite, lint, type check or build locally: CI is
the rest of the gate, and it runs when the branch is pushed. Push only when the stated
endpoint or the playbook's scope authorizes it (a playbook's own route table wins: bug-fix
pushes through `ss:ship`, after its review loop), then follow the run with
`terminal(background=true, notify=true)` and `gh run watch <id> --exit-status` and fix what
it surfaces. An endpoint of "local commit" skips the CI half; say so in the close.

## 3. Run it

- **Worklist.** Copy the playbook's steps into a todo list, word for word, and tick them as
  you go. Never mark a step done without the evidence it asks for.
- **Stated endpoint.** Run to the endpoint the person stated. If they left it open, ask
  once with `clarify`: stop at a local commit, a pushed branch, or an open PR.
- **Preservation check** before every commit, as the operating frame says.
- **Subagents.** Builder, reviewer and scout are ephemeral `delegate_task` children with no
  memory. Give each a standalone brief: goal, repo, worktree, branch, acceptance criteria,
  limits. Route by model with the task's `option`: `sonnet` for the reviewer and scouts, the
  default `opus` for the builder. Set `option` only when `hermes delegation config --show`
  lists that route and this session's `delegate_task` offers it; otherwise leave it out and
  say the child runs on the default model. Children cannot ask the person anything: they return their
  questions and you ask with `clarify`.
- **A separate front.** Work that should outlive this turn, or needs its own worktree and
  branch, runs as its own session on this Bot: write the brief to `$TMPDIR/<front>.md`, then
  `terminal(background=true, notify=true)` with
  `hermes chat --query-file $TMPDIR/<front>.md --oneshot -Q --in <worktree>`. Optionally track
  it on a Kanban card. Set `completion_contract` at creation to `OWNER/REPO` or the exact PR
  URL, and only when the base branch has required checks; otherwise `local-only`.
- **Recover after compaction.** Re-read the worklist, and the card if there is one. Pick up
  at the first unticked step.

## 4. Close

Say what changed, what is verified (by what evidence), and what is left. End with the next
step as a `clarify` choice, with "stop here" always among the choices, unless the scope was
authorized up front.

The mode stays on for later turns. It applies when a playbook matches and keeps out of the
way otherwise. The person can turn it off by saying so.
