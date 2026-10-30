---
status: in-progress
created: 2026-10-29
slug: orchestrate-session-naming
---

# Front naming, language and archiving

`/ss:orchestrate` opens a side session per front, and the sidebar is how the person tells
them apart. Today the rule is one line in `references/briefs.md` ("a short `name` and a
title that says what the front does") and one in `references/cleanup.md` ("rename when the
scope changes"). That left titles in two languages and three shapes, `name`s cut by the app
mid-word at 24 characters (`reconstruir-code-deep-re`), an orchestrator still titled after
the first task it ran ("Clone athenabriana.com repository"), and finished fronts left in
the sidebar until someone answered whether to archive them.

This spec gives every front one title pattern and one `name` rule, says when a title
changes, gives the orchestrator's own session the same pattern, archives each front as
soon as it ends, and moves the traffic between orchestrator and fronts to English, which
costs fewer tokens. The person still reads and answers in their own language.

Success: a glance at the sidebar shows one pattern, only the fronts still working, every
`name` matching the slug of the front's spec and branch, and the orchestrator's session
saying it is the orchestrator.

## Where the rule lives

`references/briefs.md` gains a section, "Naming a front", that holds the title, the `name`
and the rename rule. `references/cleanup.md` and `SKILL.md` point to it instead of
restating it. The `name` is deterministic, so a stdlib script makes it:
`plugins/ss/skills/orchestrate/scripts/front_name.py` takes the slug or the title and the
`name`s of the run's live sessions, and prints the `name` or the collision.

## The title

An imperative in English, a verb and the outcome, sentence case, under 60 characters (the
app's limit): "Fix session naming in orchestrate", "Add diagnose skill", "Migrate sites to
Cloudflare". The title says what the front delivers. The stage (shape, build, PR), the
repo and the ss skill the front runs stay out of it; the sidebar already shows the PR and
its state. A skill appears only when it is the thing being built, as in "Add diagnose
skill".

## The `name`

The `name` is the front's slug: the `.ss/<slug>/` folder its spec lives in and the branch
it works on. The orchestrator picks the slug when it opens the front, passes it as the
`name` and as `branch_name` to `start_session`, and writes it into the brief as the slug
the front's `/ss:shape` uses. One name per thing: the sidebar row, the branch and the spec
folder carry the same words.

`start_session` takes `[a-z0-9-]` and at most 24 characters, and the name never changes
after the start. A slug over 24 is cut at the last hyphen that fits, never inside a word:
`orchestrate-session-naming` becomes `orchestrate-session`. A front with no spec (a bug for
`/ss:diagnose`, a PR for `/ss:takeover`) gets the slug of its branch, made from its title.

## Renaming

A front's title changes only when its work changes: the orchestrator reuses the front for
another task, or the scope grows or shrinks until the old title misleads. A new stage, a
PR opening, a front finishing: none of these renames. Archiving is what closes a front.

When the person set the title themselves, the app asks them to approve the new one, and
the orchestrator says which approval is waiting.

## Archiving

The orchestrator archives a front (`archive_session`, the reason naming the PR or the
report) as soon as the front ends, without asking. The question `cleanup.md` asks today on
the first landing goes away.

- **A front with a PR** ends when the PR merges into `main`.
- **A front with no PR** (research, a report, a shape) ends when its report has arrived
  and the person has received what they needed from it.
- **A front whose PR is abandoned** ends when the PR closes with its comment.

The steps `cleanup.md` keeps run before the archive: stop what the front left running, and
move an app the person uses off the front's folder. Outside auto mode the app asks the
person to approve each archive, so the orchestrator says which approvals are waiting.

A shaped spec's build opens a new front with the same slug: the shape front is archived by
then, and an archived session does not hold its `name`. A follow-up on an archived front
with no PR goes to that front again: the orchestrator unarchives it and sends the message.

## The orchestrator's own title

When the mode starts, the orchestrator renames its own session (`set_session_title` with
`"self"`) to `Orchestrate <project>`, the project being what the run covers: "Orchestrate
shipshape". It renames again when the run moves to another project, under the same rule
as a front.

## Language

Everything that travels between the orchestrator and a front is English: the title, the
`name`, the brief and its `background`, the questions a front sends, its reports and the
orchestrator's answers. Two things keep their own language:

- **The person's words, quoted.** The brief quotes the request as the person said it, and
  an answer goes back to the front quoted as the person gave it.
- **What the person reads.** The orchestrator asks the person, through `AskUserQuestion`,
  in the person's language, and reports to them in it. A front's English question becomes
  the person's language there.

Every file of the plugin is English already, except `plugins/ss/agents/ss-reuse-check.md`,
whose `description` is Portuguese. It becomes English.

## Decisions

- A front's title is an English imperative, a verb and the outcome, sentence case, under 60
  characters, with no stage, repo or skill unless the skill is the outcome.
- A front's `name` is its slug, the same one its `.ss/<slug>/` folder and its branch carry.
  The orchestrator picks it at the start and passes it as `name`, as `branch_name` and in
  the brief.
- A slug over 24 characters is cut at the last hyphen that fits for the `name`; the branch
  and the spec folder keep the whole slug.
- A front's `name` never changes. Its title changes only when its work changes, never for a
  stage, a PR or the end of the run.
- The orchestrator renames its own session to `Orchestrate <project>` when the mode starts,
  and again when the run moves to another project.
- Briefs, `background`, front questions, front reports and the orchestrator's messages to a
  front are English. The person's quoted words stay as said, and what the person reads is
  in the person's language.
- `plugins/ss/agents/ss-reuse-check.md` is translated to English.
- The rule lives in "Naming a front" in `references/briefs.md`; `cleanup.md` and
  `SKILL.md` point to it. `front_name.py` makes and checks the `name`.
- The orchestrator archives a front without asking as soon as it ends: at the merge for a
  front with a PR, when the person has the report for a front with none, at the close for
  an abandoned PR.
- An archived session does not hold its `name`, so a later front can take the same slug.

## Behavior

### Happy path

1. The person asks for a feature. The orchestrator picks the slug `session-naming`, the
   title "Fix session naming in orchestrate", and opens the front with `name` and
   `branch_name` both `session-naming`, and an English brief that quotes the person and
   names the slug.
2. The front runs `/ss:shape` under `.ss/session-naming/` on branch `session-naming`, and
   sends its questions in English.
3. The orchestrator asks the person in their language, and sends the answer back quoted.
4. The PR opens and merges; the title never changed. The orchestrator stops what the front
   left running and archives it, without asking.

### Edges

| when                                                       | then                                                               |
| ---------------------------------------------------------- | ------------------------------------------------------------------ |
| WHEN the slug is longer than 24 characters                 | THEN the `name` is cut at the last hyphen that fits                |
| WHEN the slug's first word alone is longer than 24         | THEN that word is cut at 24, the one case a word is cut            |
| WHEN the `name` is taken by another session of the run     | THEN the orchestrator picks another slug before the start          |
| WHEN `/ss:shape` finds the slug's folder taken by a spec   | THEN it suffixes the slug and reports it; the `name` stays         |
| WHEN the front is reused for another task                  | THEN its title is renamed; its `name` stays                        |
| WHEN the front moves from shape to build, or opens its PR  | THEN its title stays                                               |
| WHEN the person set the front's title                      | THEN the rename waits on their approval, and the orchestrator says |
| WHEN the person declines a rename                          | THEN the title stays, and the orchestrator does not ask again      |
| WHEN the orchestrator's title already is `Orchestrate <p>` | THEN it makes no call                                              |
| WHEN the request is in Portuguese                          | THEN the brief quotes it in Portuguese, the rest is English        |
| WHEN a front sends a question in English                   | THEN the person reads it in their language                         |
| WHEN the title would pass 60 characters                    | THEN the orchestrator writes a shorter one, never a truncated one  |
| WHEN a front's PR merges                                   | THEN the front is archived, with no question                       |
| WHEN a front with no PR sends its report                   | THEN it is archived once the person has what they needed           |
| WHEN a front's PR closes abandoned                         | THEN the PR gets its comment, then the front is archived           |
| WHEN the run is outside auto mode                          | THEN each archive waits on approval, and the orchestrator says so  |
| WHEN the person declines an archive                        | THEN the front stays, and the orchestrator does not ask again      |
| WHEN a shaped spec's build starts after the shape front    | THEN the new front takes the same slug as its `name`               |
| WHEN the person follows up on an archived front with no PR | THEN the orchestrator unarchives it and sends the message there    |

## Attention points

- The other front's `spec/orchestrate-entry` rewrites `SKILL.md`, `references/briefs.md`,
  `references/relay.md` and adds `plugins/ss/references/front-contract.md`; this build
  edits the same files and starts from them only after that PR lands on `main`.
- `.ss/wiki/index.md`, `.ss/wiki/log.md` and `entities/index.md` are derived and both
  branches write them, so the merge conflicts there.
- `start_session` derives `name` from the title when it is omitted, so any path that opens
  a front without passing `name` brings back the mid-word cut.
- `set_session_title` declines in unattended sessions when the person set the title, so a
  rename can fail silently in auto runs.
- `doc-style.md` says a string the person reads follows their language; the English rule
  for front traffic must read as a narrowing of it, not a contradiction.
- Whether `start_session` accepts a `name` an archived session still carries is unverified;
  the new build front of a shaped spec depends on it.
- Archiving removes the front's worktree, so a follow-up on an unarchived front with no PR
  may find its folder gone.

## Tasks

### Foundation

- [x] **1. The `name` script**: `plugins/ss/skills/orchestrate/scripts/front_name.py`,
      stdlib, takes a slug or a title and the names of the run's live sessions, prints the `name`
      (charset, 24, cut at a hyphen, collision flagged). · verify: python3
      plugins/ss/skills/orchestrate/scripts/front_name.py orchestrate-session-naming

### The rules

- [x] **2. Naming and language in the brief**: `references/briefs.md` gains "Naming a
      front" (title, `name`, slug in the brief) and the English rule replaces "the
      language the person speaks"; `plugins/ss/references/front-contract.md` says front
      messages are English. · verify: reading
- [x] **3. The orchestrator's side**: `SKILL.md` renames its own session at the start
      and points at the rule in `briefs.md`; `references/cleanup.md` drops the archive
      question, archives each front when it ends and points its rename bullet at
      `briefs.md`; `references/relay.md` says the person reads a front's question in
      their language. · verify: reading
- [x] **4. Translate the reuse check**: the `description` of
      `plugins/ss/agents/ss-reuse-check.md` in English, same contract. · verify: CI

## Out of scope

- Renaming the sessions of runs already open or archived.
- A stage or state marker in titles (shape:, build:, done). _revisit_ if the sidebar alone
  turns out not to show where a front stands.
- Translating the person-facing strings of the skills, which follow the person's language.

## Open

Nothing.
