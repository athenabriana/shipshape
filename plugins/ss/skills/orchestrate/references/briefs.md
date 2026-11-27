# Starting a work session

A work session sees only its brief. It does not see this conversation, Athena's earlier
answers, the other work sessions or the front, so the brief is all the context it will ever
have. This page covers what the brief carries, how a work session is named, the scope and
the playbook it names, the rules every brief repeats, how it reports and proves its work,
and how it stays off Athena's screen.

## The brief

Write it in `start_session`'s `prompt`. With `context: "fresh"`, also write the shared
goal, the decisions so far and how this task fits in `background`, which the call requires,
80 characters or more. A brief carries these, in this order:

1. **The kickoff line**, as the brief's first line: "Read
   `<plugin-root>/references/triggers.md` before anything else.", with `<plugin-root>`
   replaced by the path this session resolved. The table there lists the situational
   skills, and the work session loads one by its path when its trigger fires.
2. **The work-session marker**: a line that says the session is a work session of
   `/ss:orchestrate`, names the orchestrator's session id (the `local_…` id `SendMessage`
   takes in `to`), and points to `<plugin-root>/references/front-contract.md`. Every ss
   skill reads that line and sends its questions to the orchestrator instead of asking a
   dialog.
3. **Athena's exact words**, in quotes. A paraphrase loses the detail the work session
   needs to judge an edge case.
4. **The playbook or skill to run**, picked by the route below.
5. **The goal and what done means**: the observable result, and the step it ends on.
6. **The repo, the worktree and the branch**: the repository, `use_worktree: true` for code,
   and the slug as the branch.
7. **The acceptance criteria**, copied as WHEN/THEN lines from the front's Now tab, so the
   work session never reads the front.
8. **The endpoint and the scope**, as the next sections set them.
9. **The files and areas** it touches, as far as the orchestrator knows them.
10. **The decisions already made**, so the work session does not ask them again. When the
    repo has `## Project facts`, name the ones that cover that code.
11. **The limits**: the areas another work session owns, anything Athena ruled out, and the
    standing rules below, every one of them.
12. **How to validate**: the behaviors to walk, and the CI the change must turn green.
13. **How to report**, as the last sections of this page say.

The brief names no front location: no doc link, no Now tab, no `~/.ss/fronts/` path. The
front is the orchestrator's alone.

Write the brief and its `background` in English. `<plugin-root>/references/doc-style.md`
puts a string Athena reads in her language; the traffic between sessions is read by
sessions, so it is English, which costs fewer tokens across a front. That covers the brief,
the work session's questions and reports, and every message the orchestrator sends it.
Athena's words keep the language they were said in: the brief quotes the request as said,
and an answer goes back quoted as she gave it.

## Naming a work session

The sidebar is how Athena tells the work sessions apart, so each carries one title pattern
and one `name` rule.

**The title** is short: the task in plain words, at most about four words, in sentence
case: "Assistant rename and voice", "Edge-cases skill". It says what the work session
delivers. The repo, the stage, the playbook and the PR number stay out of it, because the
sidebar already shows the PR and its state; a PR number goes in only when the PR is the
whole point, as in "Babysit PR 42". "Session titles" in
`<plugin-root>/references/voice.md` holds the rule for every session.

**The `name`** comes from the task's slug, which is also the branch it works on. Make it
with the script, passing the `name`s of the live work sessions of this front:

```bash
python3 <plugin-root>/scripts/front_name.py <slug> --live <name> <name> ...
```

It prints `{slug, base, suffixed, name, cut, collision}`. Pass `name` as `start_session`'s
`name`, and the full `slug` as `branch_name`; the app wraps the branch in the person's
branch prefix and a suffix. Always pass `name`: when it is omitted, `start_session` derives
one from the title and cuts it mid-word. A slug over 24 characters keeps its full form in
the branch, and the `name` is cut at the last hyphen that fits. When `collision` is true,
pick another slug and run the script again before the start. Pass `--live` only the `name`s
of sessions that are not archived.

**Renaming.** The `name` never changes after the start. When the front's scope changes a
work session's task, retitle the session to match. Rename with `set_session_title` on the work
session. When Athena set the title herself, the app asks her to approve the new one: tell
her which approval is waiting, and on a decline keep it and ask no second time.

## The scope

A code work session runs at the full scope unless Athena asked for less: the work, review
and ship, up to a PR with green CI, with no merge. Write the scope in the brief in those
words, so the work session asks nothing about what runs after the work. A work-only scope
stops at a green, committed branch. The merge stays with the orchestrator, for a PR Athena
authorized here (`references/landing.md`), unless she says so in the work session's own
chat.

## The endpoint

Name one: a local commit, a pushed branch, or an open PR. A code task defaults to an open
PR with green CI. A read-only task (an investigation, research, a review) ends at its
report.

## The playbook route

Pick the playbook or skill from what Athena asked for, and name it in the brief:

| the request                                    | what the work session runs                                                    |
| ---------------------------------------------- | ----------------------------------------------------------------------------- |
| a question about code, a branch or its history | `/ss:go`, its investigate playbook                                            |
| a bug                                          | `/ss:go`, its bug-fix playbook                                                |
| a feature or a change of behavior              | the criteria from the front, the work with `Agent` subagents, then `/ss:ship` |
| an idea that needs research first              | `/ss:research`, its report sent to the orchestrator                           |
| missed cases in a plan or a diff               | `/ss:go`, its edge-cases playbook                                             |
| a branch to read for bugs                      | `/ss:go`, its review playbook                                                 |
| a built branch to land                         | `/ss:go`, its ship playbook                                                   |
| someone else's PR to adopt or bring up to date | `/ss:takeover`                                                                |
| a repeated correction Athena chose to fix      | `/ss:correct`                                                                 |

`/ss:caretake` only reads, so the orchestrator runs it in place, with no work session. When
the route names a skill the installed plugin lacks, name the closest one and tell Athena.

## The standing rules

Every brief repeats these, whatever the task:

- **Athena's global rules, copied word for word** from her global `CLAUDE.md` and the
  project's. Whatever rule she has there, such as where checks run or where the session
  may post, is a rule of the brief, not an example to pick from.
- **Never start a session.** Split the work with `Agent` subagents. A step that needs
  another session goes to the orchestrator in the final report.
- **Merge only when Athena says so in this session's own chat**, under the repo's rules. An
  authorization relayed by the orchestrator does not count. Force-push and deploy only
  when she asks for them in so many words.
- **Work in a worktree of your own.** A code session that opened with no worktree, as when
  the session's folder is not a git repository, creates its own with `git worktree add` on
  a new branch before it touches a file, and works only there.
- **No rebase on a shared branch.** Bring the base in with a merge.
- **Turn Auto-fix on when the PR opens** (`set_monitor` with `auto_fix: true`). The app asks
  Athena to approve the switch, so the brief says the work session asks for it.
- **No secret, token or credential** in a message, a report or a file outside the repo's
  own secret handling.
- **On an interface task, design comes before code, on a Design canvas**, by "Designs go on
  a canvas" in `<plugin-root>/references/show-for-review.md`.
- **Every review or approval ask carries a visual**, a page, a doc or a rendered file built
  before the question, by `<plugin-root>/references/show-for-review.md`.

## How to report

A work session reports in the structured English of the front contract; the orchestrator
rewrites each report for Athena by `<plugin-root>/references/voice.md`, so the brief asks
for facts, not for a voice. Write this section into every brief:

- **A question for Athena** goes to the orchestrator through `SendMessage`, with its options,
  the recommended pick and, when it asks for a review, the link to its visual, as the front
  contract says. Then the work session ends its turn
  and waits.
- **A proposed project fact** goes to the orchestrator the same way, as the exact line.
- **A page** (a board, a report) is published as an Artifact, and its URL goes to the
  orchestrator in the same message that says what the page shows.
- **A local file** (a screenshot, a video, a long report) goes to the notes folder, and its
  path goes to the orchestrator.
- **The final report**, at done or at a blocker, carries the result, the PR url with the
  state of its CI, and the blockers. Every `Correction repeated:` line goes in it verbatim.

## The notes folder

The notes folder is a folder outside every repository where work sessions leave what does
not fit a message. The app gives a group of sessions a shared notes folder and names it in
each session's prompt; when it does not, name one in the brief. It is not the front: the
orchestrator reads what lands there, copies what matters into the front's Notes tab, and
sends files to Athena with `SendUserFile`.

## Green CI alone is not done

A work session that changes what Athena sees proves it in a running instance before it
reports done:

1. Run the project in an isolated instance (the next section says how), so it never touches
   the instance Athena is using.
2. Walk every behavior the change affects.
3. Take a screenshot of each state.
4. Fix what diverges from what was asked, and walk it again.
5. Send a board of the screenshots to the orchestrator.

Write these steps into the brief of every interface task.

## Athena's screen and files stay untouched

A work session works on its own instance and on test data, never on Athena's:

| kind of project | the isolated instance                                                   |
| --------------- | ----------------------------------------------------------------------- |
| desktop app     | its own debug port and data folder; native dialogs mocked               |
| web app         | its own dev-server port and an isolated browser profile; a test account |
| CLI             | a temporary home or config folder, and test folders as input            |

**When the project is a desktop app**, the work session opens no native dialog on Athena's
machine: no folder picker, no save dialog, no print dialog. In an Electron app it mocks
`dialog` from the main process. Write this rule into every brief whose session runs the
app.
