# Opening a front

A side session sees only its brief. It does not see this conversation, the person's
earlier answers or the other fronts, so the brief is all the context it will ever have.
This page covers what the brief carries, the scope and the skill it names, the rules every
brief repeats, how a front reports and proves its work, and how it stays off the person's
screen.

## The brief

Write it in `start_session`'s `prompt`. With `context: "fresh"`, also write the shared
goal, the decisions so far and how this front fits in `background`, which the call
requires, 80 characters or more. A brief carries ten things:

1. **The front marker**: a line that says the session is a front of `/ss:orchestrate`,
   names the orchestrator's session id (the `local_…` id `SendMessage` takes in `to`), and
   points to `<plugin-root>/references/front-contract.md`. Every ss skill reads that line
   and sends its questions to the orchestrator instead of asking a dialog.
2. **The person's exact words**, in quotes. A paraphrase loses the detail the side
   session needs to judge an edge case.
3. **The goal and what done means**: the observable result, and the step it ends on (a
   PR open with green CI, a report, a board of screenshots).
4. **The scope**, as the next section sets it.
5. **The ss skill to run**, picked by the route below.
6. **The files and areas** the front touches, as far as the orchestrator knows them.
7. **The decisions already made**, so the side session does not ask them again. When the
   repo has `.ss/wiki/entities/index.md`, name the decisions it records for that code.
8. **What not to do**: the areas another front owns, and anything the person ruled out.
9. **How to validate**: the commands, the app run, the behaviors to walk.
10. **How to report**, as the last section of this page says, and the standing rules
    below, every one of them.

Give each side session a short `name` and a title that says what the front does. Write
every brief in the language the person speaks, and keep the person's quotes as they
said them.

## The scope

A code front runs at the full scope unless the person asked for less: build, review and
ship, up to a PR with green CI, with no merge. Write the scope in the brief in those
words, so `/ss:build` reads it and asks nothing, and the exit gate of `/ss:shape` takes it
as the answer to what runs after the build.

When the person asks for less in the request, the brief sets that scope instead. A build
only stops at a green, committed branch. A merge stays with the orchestrator, and only for a PR the person authorized (see
`references/landing.md`).

## The skill route

Pick the skill from what the person asked for, and name it in the brief:

| the request                                    | the skill the front runs         |
| ---------------------------------------------- | -------------------------------- |
| a feature or a change of behavior              | `/ss:shape`, then `/ss:build`    |
| an idea that needs research first              | `/ss:research`, then `/ss:shape` |
| a bug                                          | `/ss:diagnose`                   |
| someone else's PR to adopt or bring up to date | `/ss:takeover`                   |
| a branch to read for bugs                      | the loop of `/ss:review`         |
| a built branch to land                         | `/ss:ship`                       |

`/ss:caretake` only reads the repo, so the orchestrator runs it in place, with no front.
When the route names a skill the installed plugin lacks, name the closest skill that
exists and tell the person which one the front runs.

## The standing rules

Every brief repeats these, whatever the front:

- **The person's global rules, copied word for word** from their global `CLAUDE.md` and
  the project's. A rule like "checks run only in CI, nothing locally" is a rule of the
  brief whenever the person has it, not an example to pick from.
- **Work in a worktree of your own.** A code front that opened with no worktree, as when
  the session's folder is not a git repository, creates its own with `git worktree add`
  on a new branch before it touches a file, and works only there.
- **No force push and no rebase on a shared branch.** Bring the base in with a merge.
- **Turn Auto-fix on when the PR opens** (`set_monitor` with `auto_fix: true`). The app
  asks the person to approve the switch, so the brief says the front asks for it.
- **On an interface front, design comes before code.** The front shows screenshots
  first, two variations wherever there is a choice, and sends the choice to the
  orchestrator with the recommended pick first. It writes the code only after the person
  approves.

## How to report

Write this section into every brief:

- **A question for the person** goes to the orchestrator through `SendMessage`, with its
  options and the recommended pick, as the front contract says. Then the front waits.
- **A page** (a board, a report, a design) is published as an Artifact, and its URL goes
  to the orchestrator in the same message that says what the page shows.
- **A local file** (a screenshot, a video) goes to the notes folder, and its path goes to
  the orchestrator.
- **The final report**, at done or at a blocker, carries the result, the PR url with the
  state of its CI, and the blockers.

## The notes folder

The notes folder is a folder outside the repository, created by the orchestrator for the
run, where side sessions leave what does not fit a message: screenshots, boards, long
reports and hand-over notes. Name its path in every brief. The orchestrator reads what
lands there and sends the files to the person with `SendUserFile`. A folder outside the
repository keeps the run's material out of every branch.

## Green CI alone is not done

A front that changes what the person sees proves it in a running instance before it
reports done:

1. Run the project in an isolated instance (the next section says how for each kind of
   project), so it never touches the instance the person is using.
2. Walk every behavior the change affects.
3. Take a screenshot of each state.
4. Fix what diverges from what was asked, and walk it again.
5. Send the person a board of the screenshots, through the orchestrator.

Write these steps into the brief of every interface front.

## The person's screen and files stay untouched

A side session works on its own instance and on test data, never on the person's. What
that takes depends on the project:

| kind of project | the isolated instance                                                   |
| --------------- | ----------------------------------------------------------------------- |
| desktop app     | its own debug port and data folder; native dialogs mocked               |
| web app         | its own dev-server port and an isolated browser profile; a test account |
| CLI             | a temporary home or config folder, and test folders as input            |

**When the project is a desktop app**, the front opens no native dialog on the person's
machine: no folder picker, no save dialog, no print dialog. In an Electron app it mocks
`dialog` from the main process. A dialog that opens on the person's screen interrupts
what they are doing and can act on their real files. Write this rule into every brief
whose front runs the app.
