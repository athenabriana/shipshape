---
name: fronts
description: The main Bot's skill for front Bots. A front is a full-stack feature, usually several PRs across several repos, and runs as one Hermes Bot (a profile) the person talks to directly. This skill creates a front Bot (profile, brief, persona, description), manages the ones that exist (list them, update a brief, ask one a cross-front question with message_agent, hand it work) and retires one after a closing summary. Use when the person says "start a front for X", "create a bot for X", "what bots do I have", "what's in flight", "update the brief of X", "ask X about Y", "hand this to X", "X is done", "retire the X bot" or "delete the X bot". Not for code work inside a front (that is ss:go on the front's own Bot) and not for a role without memory such as builder, reviewer or scout (those are delegate_task subagents).
license: MIT
metadata:
  author: Athena Briana - github.com/athenabriana
  version: 0.3.0
---

# Front Bots

The person runs one Hermes Bot (profile) per **front**: a full-stack feature, usually several
PRs across several repos. They talk to each front Bot directly. The **main Bot** (`default`)
creates, manages and retires front Bots, answers cross-front questions, and never does a
front's work itself.

**No Bot writes code, the main Bot included.** Bots plan, brief, track and report. Code is
written only by sessions a Bot starts: a background
`hermes -p <bot> chat --query-file <brief> --oneshot -Q --source cli --in <worktree>` run with
`terminal(background=true, notify=true)`, which notifies the Bot when it exits (`ss:go`,
"Start a session", has the whole lifecycle).
Reading code and running `gh` or `git log` is fine.

## Read the person's setup first

Nothing personal is hard-coded here. Before creating or retiring a Bot, read from the main
Bot's memory and the relevant repos' `AGENTS.md`:

- the person's name and the language they write in (briefs and personas use that language);
- where their code lives (workspace folders) and which repos the front spans;
- where closing summaries of retired fronts are archived.

Ask with `clarify` for anything neither source says, recommended choice first (for the
archive: `~/.hermes/fronts/`). Offer to save the answer to memory so the next run does not ask.

## Create a front Bot

Only when the person asks. Ask with `clarify` for anything missing: the front's name and what
it covers. Name: lowercase, `a-z0-9-`, the front's short name (`backoffice-data`). One Bot
per front, never one per PR.

1. **Profile:** `hermes profile create <name> --clone --description "placeholder"`.
   `--clone` copies config (model routes, toolsets), `.env`, `SOUL.md`, skills, plugins
   (`ss`, advanced-delegation) and memories. Logins are shared with `default` unless
   `--isolated-auth` is passed. Check the Bot answers:
   `hermes -p <name> chat -q "Say OK" --oneshot -Q --source cli` (expect `OK`).
2. **Context:** one `delegate_task` child (`"option": "sonnet"` if that route exists) builds
   the brief, read-only, in the person's language, from:
   - Claude Code transcripts and Desktop session titles
     (`<plugin-root>/skills/fronts/references/claude-code-sessions.md` has the paths and
     fields; text blocks only, read from the tail);
   - local files in the person's workspace folders for the front's repos;
   - live `gh pr list` / `gh pr view` on those repos.

   Brief sections: goal and state (with dates); repos, paths, branches and PRs; decisions and
   open questions with who decides; people and channels; connectors and MCPs needed (never
   secret values); conventions; the 5-10 transcripts worth reading. The child's final text
   can be truncated in its transcript log: write the brief file from the returned result,
   not from the log.

3. **Brief file:** `~/.hermes/profiles/<name>/FRONT.md`.
4. **Persona:** append to `~/.hermes/profiles/<name>/SOUL.md`, keeping the cloned persona
   above it. Heading `# Your front: <front>`, then:
   - who it is, and that it reads `FRONT.md` at the start of every new session and checks
     live state (`gh`, `git`) before acting;
   - the nearest pending item;
   - use the `ss` skills (`ss:go` for engineering work);
   - questions only through `clarify`; when the person answers with a question, explain in
     plain text instead of asking again;
   - never merge, never `--admin`, never post to Slack, GitHub or any channel without the
     person's OK; checks run in CI;
   - which connectors and MCPs are NOT connected and must not be connected without the
     person's explicit OK;
   - reply in the person's language.

   Then a `## You never write code` section, scoped to the chat the person talks to: as that
   chat, the Bot plans, briefs, tracks and reports, and code is written only by sessions it
   starts (`ss:go`, "Start a session"). Sessions run on this same profile and read this same
   persona, so the section also says: a session whose brief names it a session started by
   the Bot is the worker, and does the brief's work (edits, commits, pushes, opens the PR the
   brief asks for); the "no posting without OK" rule covers anything beyond the brief.

5. **Description:** `hermes profile describe <name> --overwrite --text "Owns the <front> front: ..."`.
6. **Memory:** the cloned `memories/USER.md` comes from the main Bot. Make sure it says the
   person talks to front Bots directly, and fix any line that calls a single chat the
   orchestrator.
7. **Report:** what the Bot knows, what is pending, and what was left off on purpose (for
   example an MCP with personal data). Tell the person the Bot is in the app's Bots tab.

## Manage

- **List:** `hermes profile list`, plus each description (`hermes profile show <name>`).
- **Update a brief:** re-run step 2 for what changed and rewrite `FRONT.md`, or append a dated
  `Update` bullet to the persona's front section (status changes, handoffs, reports). Put a
  long report in a file in the profile dir and point to it.
- **Ask a front Bot** (a cross-front question): `message_agent(target="<name>", ...)` with a
  self-contained message the main Bot writes, never the person's words pasted verbatim. It is
  asynchronous: end the turn and relay the reply when it arrives. For several Bots, pass
  comma-separated targets in one call. A plain status question (a PR's state) is answered
  with `gh` directly.
- **Hand work to a front Bot:** the same `message_agent`, with a standalone brief. The front
  Bot starts the session itself.
- **Connect an MCP or connector for one Bot** only on the person's explicit OK. No MCP with
  personal data (mail, calendar, chat, files) is connected without their explicit approval
  of that scope.

## Retire (delete)

Destructive: always confirm with `clarify` first, naming the Bot, with the choices "save a
closing summary, then delete" (recommended), "keep it", and "delete without a summary".

1. **Closing summary:** ask the Bot with `message_agent` what landed, what is left, the open
   questions, and where things live. Wait for the reply.
2. Save it to `<archive>/<name>-<YYYY-MM-DD>.md` (the archive folder from the setup above;
   create it if needed), and carry every leftover item into the main Bot's answer to the
   person.
3. Check nothing still runs for it: its cron jobs (`hermes -p <name> cron list --all`; PR
   watchers, created by `ss:babysit`, are named `ss-babysit OWNER/REPO#N`), its live sessions (ask it with
   `message_agent` which background sessions are still running, and check
   `pgrep -af "hermes -p <name> "`), and worktrees it owns (`git worktree list` in its
   repos). Report what is still open instead of deleting over it.
4. `hermes profile delete -y <name>`. **Never delete `default`.**

## Pitfalls

- Bots are profiles, not skills: a role without memory (builder, reviewer, scout) is a
  `delegate_task` subagent, not a Bot.
- Do not create a Bot per PR; a front spans many PRs and repos.
- Background sessions must pass `--source cli`, or they inherit the Bot's own source label and
  can be hidden in the app.
- The main Bot does not do a front's work, not even a quick fix: it hands it to the front's
  Bot.
