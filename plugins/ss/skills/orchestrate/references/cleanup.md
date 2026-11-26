# Cleaning up

The orchestrator tidies up itself. A work session asked to clean up after itself can
archive the wrong thing or stop mid-way, so these steps stay here.

## When a work session ends

The orchestrator archives each work session as soon as it ends, without asking Athena:

- **A work session with a PR** ends when the PR merges into `main`.
- **A work session with no PR** (research, a report, a shape) ends when its report has arrived
  and Athena has received what she needed from it. A report that leaves a question
  open or a decision pending has not ended its work session.
- **A work session whose PR is abandoned** ends when the PR closes with its comment.

## The steps

When a work session ends, run these in order:

1. **Stop what the work session left running**: dev servers, app instances, watchers. Check the
   ports and processes the session's brief named, and stop each one.
2. **Move a running app to `main`.** When Athena is using an app that runs from the
   work session's folder, restart it from `main` first; archiving removes the worktree it runs
   from.
3. **Close an abandoned PR with a comment** that says why it closed and where the work
   went, if anywhere.
4. **Make sure the session's work outlives its folder.** Archiving removes the worktree, so
   everything the work session wrote is committed and pushed on its branch, or sits in the notes
   folder. When something is not, ask the work session to commit and push it, and archive only
   once its answer confirms it.
5. **Archive the work session** with `archive_session`, the `reason` naming the PR ("PR #42
   merged") or the report ("research report delivered").

Outside auto mode the app asks Athena to approve each archive. Say which approvals
are waiting, so tidying up does not stall unnoticed. When Athena declines an archive,
the work session stays in the sidebar, and the orchestrator does not ask again for that work session for
the rest of the run.

## A follow-up on an archived work session

A follow-up on an archived work session with no PR goes to that work session again. First check that no
live work session of the front holds its `name`; when one does, the follow-up goes to that live
work session instead. Otherwise unarchive it with `unarchive_session`, then send the message.
Archiving removed the session's worktree, so the message says its folder may be gone and its
work lives on its branch or in the notes folder.

## Renaming

- **Rename a work session only when its work changes**, with `set_session_title`, by the rule in
  `references/briefs.md`, "Naming a work session".
