---
name: mode
description: Ship Shape's rigor mode for Hermes. Reads the request, matches it to one playbook (investigate, bug-fix, review, ship), sizes the process to the risk with a lightweight, standard or intensive route, tracks the steps on a worklist and runs each step's skill. Sticky once entered, it stays on across turns until the person opts out. Use when the user types /ss or /ss:mode, says "use ss", "be rigorous", "do this properly", or starts any non-trivial engineering task. Don't use it for a tiny mechanical change (just do it) or for a question about Hermes itself.
license: MIT
metadata:
  author: Athena Briana - github.com/athenabriana
  version: 0.1.0
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

| Route       | Gates                                                                     |
| ----------- | ------------------------------------------------------------------------- |
| lightweight | mechanical gate, one review front (correctness), preservation check, push |
| standard    | mechanical gate, `ss:review` in its default loop, then `ss:ship`          |
| intensive   | a blast-radius pass over callers first, `ss:review deep`, then `ss:ship`  |

"Keep it light" or "be thorough" from the person overrides the script. Say which route you
are on and why, in one line.

**Mechanical gate:** the cheap, objective checks come before any review. Formatter and the
repo's pre-commit hooks run locally. Tests, lints, type checks and builds run in CI: push to
the branch, follow the run with `terminal(background=true, notify=true)` and `gh run watch
<id> --exit-status`, and fix what it surfaces before a reviewer looks.

## 3. Run it

- **Worklist.** Copy the playbook's steps into a todo list, word for word, and tick them as
  you go. Never mark a step done without the evidence it asks for.
- **Stated endpoint.** Run to the endpoint the person stated. If they left it open, ask
  once with `clarify`: stop at a local commit, a pushed branch, or an open PR.
- **Preservation check** before every commit, as the operating frame says.
- **Handing work off.** A task big enough to run apart goes to a Bot through a Kanban card.
  The card body is a standalone brief: goal, repo, worktree, branch, acceptance criteria,
  limits. Assign `ss-builder` for code, `ss-scout` for reading and research. A PR card gets
  `completion_contract` set to the repo or the PR URL, so the board will not close it while
  required checks are red.
- **Recover after compaction.** Re-read the worklist and the card, if there is one. Pick up
  at the first unticked step.

## 4. Close

Say what changed, what is verified (by what evidence), and what is left. End with the next
step as a `clarify` choice, with "stop here" always among the choices, unless the scope was
authorized up front.

The mode stays on for later turns. It applies when a playbook matches and keeps out of the
way otherwise. The person can turn it off by saying so.
