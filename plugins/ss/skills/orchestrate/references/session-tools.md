# Session tools and their limits

Read by `/ss:orchestrate` at "Start a work session", before the first session tool call, and whenever the app refuses one.

## What the mode needs

The mode runs on the Claude Code desktop app's session tools and, for a doc front, the
Claude Docs tools. When they are listed as deferred tools, load them with `ToolSearch`
before the first call.

| tool                                    | what the orchestrator uses it for                                       |
| --------------------------------------- | ----------------------------------------------------------------------- |
| `start_session`                         | start a work session; with `context: "fresh"`, `background` is required |
| `SendMessage`                           | reach a work session; `to` takes its `local_…` id                       |
| `list_sessions`                         | the state of every work session, with `linked: true`                    |
| `list_events`                           | read the end of a work session's conversation                           |
| `SendUserFile`                          | put a screenshot, a board or a report in front of Athena                |
| `archive_session`                       | archive a work session as soon as it ends (`references/cleanup.md`)     |
| `set_session_title`                     | title this session, and rename a work session when its task changes     |
| Docs `read`, `batch`, `update`, `guide` | read and write the front doc (`<plugin-root>/references/front-doc.md`)  |

**Wait without polling.** Pass `wake_when_done: true` to `start_session`, or
`notify_when_idle: true` to `SendMessage`, and the app wakes the orchestrator when the work
session ends its turn.

When the session tools are not there at all, say that this session cannot start work
sessions, and offer `/ss:go` in this session instead.

## Limits to say out loud

- **A turn that began with another session's message cannot start a session.** Propose it,
  and Athena starts it with one click or one word here.
- **Remote Control can refuse to start sessions.** Ask Athena to type the request in the
  desktop app.
- **A repository the app never opened asks for "Trust repository"** before its first work
  session. Ask Athena to open it once.
- **Some calls wait on Athena's approval.** Outside auto mode, the app asks her to approve
  each archive, each Auto-fix switch and each rename of a title she set: say which approval
  is waiting.
