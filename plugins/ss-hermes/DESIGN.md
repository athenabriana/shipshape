# ss on Hermes: a playbook router, not a spec pipeline

The design for `plugins/ss-hermes`, approved by Athena on 2026-11-25. Shipshape for
Hermes is designed for Hermes, based on poteto's pstack, rather than a word-for-word port
of `plugins/ss`. Version 0.1.0 builds the first stage of section 6.

## 1. What changes and why

|                      | ss 4.2 (Claude Code)                                      | ss on Hermes (this design)                                                                                              |
| -------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Entry point          | one skill per verb: `/ss:shape`, `/ss:build`, `/ss:ship`… | one sticky mode, `/ss`, that matches the request to a **playbook**; the verbs stay available as shortcuts               |
| Where state lives    | `.ss/<slug>/spec.md` with `status:`                       | a **Kanban card**: the body holds the acceptance criteria, comments hold progress, `--completion-contract` holds the PR |
| How much process     | shape → spec → build, always                              | a **route sized to risk**: lightweight, standard or intensive (pstack's five risk facts)                                |
| Parallel work        | `Workflow` + `build-tasks.js`                             | Kanban cards with dependency links, workers in worktrees, `--goal` for open-ended cards                                 |
| Second opinion       | Codex CLI as judge                                        | a `reviewer` profile on a different model                                                                               |
| Fronts (orchestrate) | `/ss:orchestrate` + Desktop side sessions                 | no playbook: Bots + Kanban do the dispatch; coordination rules live in the frame (§4)                                   |
| Recurring work       | `/loop`, Desktop scheduled tasks                          | `cronjob` (caretake digest, PR babysit)                                                                                 |
| Session frame        | `SessionStart` hook                                       | `ctx.register_system_prompt_section`                                                                                    |
| Pages for you        | Artifact, Design canvas                                   | an HTML file shown with `::preview`, or attached to the card                                                            |

There is no spec file. When work is unclear, the **shape** playbook settles the open
questions and writes the outcome to card bodies as acceptance criteria. Facts about the
project that the code doesn't show (a choice, a trap, a constraint) go into the repo's `AGENTS.md`.

## 2. Playbooks (`/ss <request>` picks one)

| Playbook       | Comes from                             | Short version                                                                                                    |
| -------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| investigate    | gather-branch-context, research (code) | read-only question about code or history; answer with evidence                                                   |
| research       | research                               | outside evidence for a decision, with sources and gaps                                                           |
| shape          | shape                                  | settle unclear points through `clarify`, then write cards with acceptance criteria; ends at a gate               |
| feature        | build                                  | break into cards → workers in worktrees → mechanical gate → review → ship                                        |
| bug-fix        | diagnose                               | reproduce → root cause → smallest fix → prove it fails before and passes after                                   |
| refactor       | new (pstack)                           | behavior-preserving; proof is the same tests before and after                                                    |
| review         | review                                 | fronts in parallel (`delegate_task`, finder/verifier roles) + a judge from the reviewer profile; up to 3 rounds  |
| ship / babysit | ship                                   | green the checks in CI, open or finish the PR, follow it with a cron watcher; **never merges**                   |
| takeover       | takeover + session pickup              | adopt or modernize someone else's PR, **or** continue a Claude Code / earlier Hermes session from its transcript |
| caretake       | caretake                               | cron digest of open PRs, Dependabot and outdated dependencies → Slack or a sticky comment                        |
| pause / resume | new (pstack)                           | park in-flight work on its card so any session can pick it up                                                    |

Standalone skills that stay as they are: `review-setup`, `write-readme`, `correct`.

### Routes (from pstack)

Feature, bug-fix and refactor first record five facts: blast radius, reversibility, data
or auth involved, test coverage nearby, and number of files. A small script
(`scripts/route.py`) maps them to a route:

- **lightweight:** no cards; edit, run the mechanical gate, one review front, then push.
- **standard:** cards, review with a judge, PR.
- **intensive:** shape first, the full review panel, a second judge model, and a blast-radius check.

"Keep it light" and "be thorough" override the route.

## 3. How it uses Hermes

- **Plugin** at `plugins/ss-hermes/` in the shipshape repo, built for Hermes only and with no shared wording for Claude Code, installed with
  `hermes plugins install` and enabled with `hermes plugins enable ss`. It registers:
  - skills through `register_skill` → `ss:mode`, `ss:review`, … (slash commands `/ss:*`)
  - the operating frame through `register_system_prompt_section`. It reaches new sessions only.
  - role prompts in `roles/` (finder, verifier, reuse-check, judge). These are passed as `context` to `delegate_task`.
  - hooks: `kanban_task_blocked` → desktop notification; `on_session_start` → read the frame again after compaction.
- **Bots** (Hermes profiles shown in Bot Mode; created by `/ss:setup`, which asks before creating any). Routines such as caretake and the PR watcher are attached to their Bot instead of running as loose cron jobs:
  - `default`: the coordinator (you talk here), on Claude Opus 5.5
  - `ss-builder`: card workers, on Claude Opus 5.5
  - `ss-reviewer`: the judge and second opinion, on Claude Sonnet 5.5. It is a different model from the builder, but from the same vendor.
  - `ss-scout`: investigation, research and the caretake digest, on Claude Sonnet 5.5

  All four use the Anthropic login that is already connected. The review panel's finder
  and verifier roles are `delegate_task` children of whichever Bot runs the review.

- **Kanban** replaces `build-tasks.js`: one card per task, linked by dependency, assigned
  to `ss-builder`, `--completion-contract owner/repo` on PR cards, and `--goal` only for
  open-ended cards. The completion gate already refuses cards whose required checks are
  red, so "CI must be green" is enforced by the board, not by a prompt.
- **Routines (cron under the hood):** the caretake digest on `ss-scout`, and a PR watcher on `ss-builder` when you leave a PR in review.
- **Questions:** `clarify`, at most 4 per call, each with a recommended choice first. If a
  call times out, ask again immediately rather than stopping (this happened today).

## 4. Rules carried over unchanged

### Coordination (replaces `/ss:orchestrate`)

There is **one coordinator: the chat you talk to.** Bots working on fronts may split their
own task with `delegate_task` or child cards, but they report to the coordinator and never
to a second coordinator. These rules go in the operating frame, so any session that hands
work to a Bot follows them:

1. **Standalone brief.** A card's body has everything the worker needs: goal, repo,
   worktree, branch, acceptance criteria and limits. The worker sees nothing of the chat.
2. **One conversation.** Bot questions reach you through the coordinator, using
   `kanban_block` and then a relay in the chat. You never have to open a Bot's chat.
3. **Merge only on explicit authorization** given in the coordinator chat, under the
   repo's rules. Authorization is never passed down to a Bot.
4. **Clean up after a front lands:** remove the worktree, archive the card, delete the branch if merged.

**When to add a second level:** per-project lead Bots, only if one coordinator is
juggling more than one project and losing the thread. Adding them later is cheap
(a new Bot plus a brief), so they are not designed now.

### Safety

- Never merge; the exception is orchestrate with your explicit authorization in this chat.
- Never push a protected branch, force-push or deploy.
- Checks run in CI, not locally: push, then follow CI to green.
- Recommend a next step at the gate instead of running it, unless the scope was authorized up front.
- Product questions go to `#bot-product-discussion` through `abrir-discussao`. Questions only you can answer, I ask you directly.

## 5. Migration

- Remove the old imports in `~/.hermes/skills/claude-code-imports/`: `spec`,
  `implement`, `review`, `review-setup`, `ship`, `gather-branch-context`,
  `maintain-repo`, `write-readme`.
- Keep: `brisar`, `challenge`, `discover`, `legal-lens`, `profile`, `think`,
  `code-deep-research`, `wave`, `abrir-discussao`.
- `.ss/wiki/` is dropped. Project facts go into `AGENTS.md`, which Hermes loads automatically.
  Note: Hermes reads only the first of `.hermes.md` > `AGENTS.md` > `CLAUDE.md`, so a repo
  must not have a `.hermes.md` that hides its `AGENTS.md`.
- `.ss/<slug>/spec.md` is dropped. Specs that already exist stay where they are and are not migrated.
- The Claude Code plugin `plugins/ss/` is **not touched**.

## 6. Build order

1. **v0:** plugin skeleton, frame, `/ss` router with investigate / bug-fix / review / ship, roles, and the profiles setup.
2. **v1:** feature on Kanban, shape without a spec, routes script, takeover and session pickup, coordination rules in the frame.
3. **v2:** caretake and the PR watcher as Bot routines, pause/resume.

Each version is a PR to `athenabriana/shipshape`. Checks run in CI. You merge.

## 7. Decisions (all settled)

- No orchestrate playbook. One coordinator, with its rules in the frame (§4).
- Hermes only: `plugins/ss-hermes/` is its own tree, and `plugins/ss/` stays as it is for Claude Code.
- No spec file. Kanban cards hold the state, and project facts go in `AGENTS.md` instead of `.ss/wiki/`.
- Models: the coordinator and builder run Opus 5.5; the reviewer and scout run Sonnet 5.5.
- All the pstack ideas stay: routes, the mechanical gate before review, pause/resume, the
  preservation check before commits, and catch-ups.
- Every question to Athena goes through `clarify`, never as plain text.
