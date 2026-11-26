# ss on Hermes: a playbook router, not a spec pipeline

The design for `plugins/ss-hermes`, approved by Athena on 2026-11-25. Shipshape for
Hermes is designed for Hermes, based on poteto's pstack, rather than a word-for-word port
of `plugins/ss`. Version 0.1.0 built the first stage of section 6; 0.2.0 reworked it after review; 0.3.0 renamed the entry skill from `ss:mode` to `ss:go` and split the main Bot from the front Bots; 0.4.0 split the PR watcher out of `ss:ship` into `ss:babysit`.

## 1. What changes and why

|                      | ss 4.2 (Claude Code)                                      | ss on Hermes (this design)                                                                                          |
| -------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Entry point          | one skill per verb: `/ss:shape`, `/ss:build`, `/ss:ship`… | one sticky mode, `/ss:go`, that matches the request to a **playbook**; the verbs stay available as shortcuts        |
| Where state lives    | `.ss/<slug>/spec.md` with `status:`                       | the **session brief** holds the acceptance criteria, the session's worklist holds progress, the PR holds the result |
| How much process     | shape → spec → build, always                              | a **route sized to risk**: lightweight, standard or intensive (pstack's five risk facts)                            |
| Parallel work        | `Workflow` + `build-tasks.js`                             | background `--source cli` sessions in worktrees, one per task, each started from a standalone brief                 |
| Second opinion       | Codex CLI as judge                                        | a judge subagent on another model route (`sonnet`)                                                                  |
| Fronts (orchestrate) | `/ss:orchestrate` + Desktop side sessions                 | no playbook: one Bot per front, sessions on that Bot do the code; coordination rules live in the frame (§4)         |
| Recurring work       | `/loop`, Desktop scheduled tasks                          | `cronjob` (caretake digest, PR babysit)                                                                             |
| Session frame        | `SessionStart` hook                                       | `ctx.register_system_prompt_section`                                                                                |
| Pages for you        | Artifact, Design canvas                                   | an HTML file shown with `::preview`, or its path in the session report                                              |

There is no spec file. When work is unclear, the **shape** playbook settles the open
questions and writes the outcome into session briefs as acceptance criteria. Facts about the
project that the code doesn't show (a choice, a trap, a constraint) go into the repo's `AGENTS.md`.

## 2. Playbooks (`/ss:go <request>` picks one)

| Playbook       | Comes from                             | Short version                                                                                                           |
| -------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| investigate    | gather-branch-context, research (code) | read-only question about code or history; answer with evidence                                                          |
| research       | research                               | outside evidence for a decision, with sources and gaps                                                                  |
| shape          | shape                                  | settle unclear points through `clarify`, then write briefs with acceptance criteria; ends at a gate                     |
| feature        | build                                  | break into briefs → sessions in worktrees → mechanical gate → review → ship                                             |
| bug-fix        | diagnose                               | reproduce → root cause → smallest fix → prove it fails before and passes after                                          |
| refactor       | new (pstack)                           | behavior-preserving; proof is the same tests before and after                                                           |
| review         | review                                 | fronts in parallel (`delegate_task`, finder/verifier roles) + a judge subagent on `sonnet`; up to 3 rounds              |
| ship           | ship                                   | green the checks in CI, open or finish the PR, then offer `ss:babysit`; **never merges**                                |
| babysit        | ship (babysit mode)                    | a cron watcher on any PR by number: answers threads, fixes red CI, stops itself (split out of ship in 0.4.0)            |
| takeover       | takeover + session pickup              | adopt or modernize someone else's PR, **or** continue a Claude Code / earlier Hermes session from its transcript        |
| caretake       | caretake                               | cron digest of open PRs, Dependabot and outdated dependencies → the Bot chat or a sticky comment                        |
| pause / resume | new (pstack)                           | park in-flight work in its brief and worklist so any session can pick it up                                             |
| edge-cases     | new                                    | plan mode: WHEN/THEN acceptance criteria before coding; diff mode: hunt, prove and report missed cases (added in 0.2.0) |
| fronts         | orchestrate                            | the main Bot's skill: create, manage and retire front Bots, one per front (added in 0.3.0)                              |

Standalone skills that stay as they are: `review-setup`, `write-readme`, `correct`.

### Routes (from pstack)

Feature, bug-fix and refactor first record five facts: blast radius, reversibility, data
or auth involved, test coverage nearby, and number of files. A small script
(`scripts/route.py`) maps them to a route:

- **lightweight:** one session; edit, run the mechanical gate, one review front, then push.
- **standard:** a session per task, review with a judge, PR.
- **intensive:** shape first, the full review panel, a second judge model, and a blast-radius check.

"Keep it light" and "be thorough" override the route.

## 3. How it uses Hermes

- **Plugin** at `plugins/ss-hermes/` in the shipshape repo, built for Hermes only and with no shared wording for Claude Code, installed with
  `hermes plugins install` and enabled with `hermes plugins enable ss`. It registers:
  - skills through `register_skill` → `ss:go`, `ss:review`, … (slash commands `/ss:*`)
  - the operating frame through `register_system_prompt_section`. It reaches new sessions only.
  - role prompts in `roles/` (finder, verifier, judge). These are passed as `context` to `delegate_task`.
  - no hooks yet. The frame is part of the system prompt, so it survives compaction.
- **Bots, sessions, subagents** (0.1.0 created three extra profiles; 0.2.0 replaced them with
  routed subagents; 0.3.0 made it one Bot per front and moved all code into sessions):
  - **A Bot** is a Hermes profile (Opus 5.5) with its own memory. It coordinates from the chat
    the person talks to. A **front** (a full-stack feature, usually several PRs across several
    repos) runs as one Bot.
  - **Main Bot and front Bots.** The main Bot is the person's `default` profile. With
    `ss:fronts` it creates a front Bot (a cloned profile, a `FRONT.md` brief, a persona
    section, a description), lists and re-briefs them, asks one a cross-front question with
    `message_agent`, hands one work, and retires one after a closing summary (confirmed first;
    `default` is never deleted). It never does a front's work. The person talks to each front
    Bot directly, and each front Bot coordinates its own sessions.
  - **Bots never write code.** A Bot plans, briefs, tracks and reports; reading code, `gh` and
    `git log` is fine. Only the sessions it starts edit, commit and push.
  - **Sessions** run on the Bot's own profile. Every task is a background
    `hermes -p <bot> chat --query-file <brief> --oneshot -Q --source cli --in <worktree>`
    started with `terminal(background=true, notify=true)`. `--source cli` is required on every
    session, or it inherits the Bot's source label and can be hidden in the app. The brief
    opens with the session's role and holds the acceptance criteria; the session's worklist
    holds progress. The Bot is notified when the session exits, reads the tail of its log,
    titles it after its id, resumes it with `--resume <session_id>` in the background when the
    person answers its questions, and archives it once reported. `ss:go` ("Start a session")
    holds the exact commands.
  - **Inside a session** nobody answers `clarify` (questions go in the final report) and
    nothing resumes it after its turn ends (CI is followed in the foreground).
  - **Subagents:** builder, reviewer and scout are ephemeral `delegate_task` children with
    no memory, each carrying a role prompt from `roles/`. The official advanced-delegation plugin,
    in `model_map` mode, picks each child's model: a task sets `"option": "sonnet"` for the
    reviewer (the judge) and scouts, and leaves the default `opus` for the builder. A task
    sets `option` only after checking the route exists, because a missing route fails the
    whole call. The judge is a different model from the builder, but from the same vendor.
  - `/ss:setup` checks the plugin and the routes. It creates no profiles.
- **No Kanban.** 0.3.0 dropped Kanban cards because Kanban worker sessions are hidden from the app's Sessions list.
- **Routines (cron under the hood):** the PR watcher (`ss:babysit`), and later the caretake
  digest, run as cron jobs on the Bot.
- **Questions:** `clarify`, at most 4 per call, each with a recommended choice first. If a
  call times out, ask again immediately rather than stopping (this happened today).

## 4. Rules carried over unchanged

### Coordination (replaces `/ss:orchestrate`)

There is **one coordinator per front: the Bot chat you talk to.** Sessions working on a
front may split their own task with `delegate_task`, but they report to their Bot and never
to a second coordinator. These rules go in the operating frame, so any Bot or session that
hands work off follows them:

1. **Standalone brief.** A session's or subagent's brief has everything it needs: goal, repo,
   worktree, branch, acceptance criteria and limits. The worker sees nothing of the chat.
2. **One conversation.** Questions from sessions and subagents reach you through the
   coordinator, which asks with `clarify`. You never have to open another chat.
3. **Merge only on explicit authorization** given in the coordinator chat, under the
   repo's rules. Authorization is never passed down.
4. **Clean up after a front lands:** remove the worktree, archive the finished sessions, delete the branch if merged.

**When to add a second level:** per-project lead sessions, only if one coordinator is
juggling more than one project and losing the thread. Adding them later is cheap, so they
are not designed now.

### Safety

- Never merge or approve; a merge happens only on your explicit authorization in this chat.
- Never push a protected branch, force-push or deploy.
- Checks run in CI, not locally: push, then follow CI to green.
- Recommend a next step at the gate instead of running it, unless the scope was authorized up front.
- Product questions and questions only you can answer go to you through `clarify`. Nothing is posted to Slack or any other channel without your request.

## 5. Migration

- Remove the old imports in `~/.hermes/skills/claude-code-imports/`: `spec`,
  `implement`, `review`, `review-setup`, `ship`, `gather-branch-context`,
  `maintain-repo`, `write-readme`.
- Keep: `brisar`, `challenge`, `discover`, `legal-lens`, `profile`, `think`,
  `code-deep-research`, `wave`.
- `.ss/wiki/` is dropped. Project facts go into `AGENTS.md`, which Hermes loads automatically.
  Note: Hermes reads only the first of `.hermes.md` > `AGENTS.md` > `CLAUDE.md`, so a repo
  must not have a `.hermes.md` that hides its `AGENTS.md`.
- `.ss/<slug>/spec.md` is dropped. Specs that already exist stay where they are and are not migrated.
- The Claude Code plugin `plugins/ss/` is **not touched**.

## 6. Build order

1. **v0:** plugin skeleton, frame, `/ss` router with investigate / bug-fix / review / ship, roles, and setup. 0.2.0 fixes the first review's findings and replaces the extra profiles with routed subagents. 0.3.0 renames the router to `/ss:go`, runs one Bot per front with `ss:fronts`, and moves all code into sessions. 0.4.0 moves the PR watcher from `ss:ship` into its own skill, `ss:babysit`.
2. **v1:** feature as sessions, shape without a spec, routes script, takeover and session pickup, coordination rules in the frame.
3. **v2:** caretake as a routine on the Bot, pause/resume.

Each version is a PR to `athenabriana/shipshape`. Checks run in CI. You merge.

## 7. Decisions (all settled)

- No orchestrate playbook. One coordinator, with its rules in the frame (§4).
- Hermes only: `plugins/ss-hermes/` is its own tree, and `plugins/ss/` stays as it is for Claude Code.
- No spec file. The brief and the session's worklist hold the state, and project facts go in `AGENTS.md` instead of `.ss/wiki/`.
- Models: Bots and the builder run Opus 5.5; the reviewer and scout subagents run Sonnet 5.5 through the `sonnet` route. No extra profiles for roles: a profile is a front's Bot.
- Bots never write code; the `--source cli` sessions they start do.
- All the pstack ideas stay: routes, the mechanical gate before review, pause/resume, the
  preservation check before commits, and catch-ups.
- Every question to Athena goes through `clarify`, never as plain text.
