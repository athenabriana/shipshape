# Cleaning up

The orchestrator tidies up itself. A side session asked to clean up after itself can
archive the wrong thing or stop mid-way, so these steps stay here.

## When a front ends

The orchestrator archives each front as soon as it ends, without asking the person:

- **A front with a PR** ends when the PR merges into `main`.
- **A front with no PR** (research, a report, a shape) ends when its report has arrived
  and the person has received what they needed from it.
- **A front whose PR is abandoned** ends when the PR closes with its comment.

A shaped spec's build opens a new front with the same slug as its `name`. The shape front
ends with its report, so archive it before the build front opens.

## The steps

When a front ends, run these in order:

1. **Stop what the front left running**: dev servers, app instances, watchers. Check the
   ports and processes the front's brief named, and stop each one.
2. **Move a running app to `main`.** When the person is using an app that runs from the
   front's folder, restart it from `main` first; archiving removes the worktree it runs
   from.
3. **Close an abandoned PR with a comment** that says why it closed and where the work
   went, if anywhere.
4. **Archive the front** with `archive_session`, the `reason` naming the PR ("PR #42
   merged") or the report ("research report delivered").

Outside auto mode the app asks the person to approve each archive. Say which approvals
are waiting, so tidying up does not stall unnoticed. When the person declines an archive,
the front stays in the sidebar and the orchestrator does not ask again.

## A follow-up on an archived front

A follow-up on an archived front with no PR goes to that front again. Unarchive it with
`unarchive_session`, then send the message. Archiving removed the front's worktree, so the
message says its folder may be gone and its work lives on its branch or in the notes
folder.

## Renaming

- **Rename a front only when its work changes**, with `set_session_title`, by the rule in
  `references/briefs.md`, "Naming a front".
