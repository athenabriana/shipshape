# While work sessions run

The orchestrator is the only place Athena looks. This page covers how questions, reports
and artifacts reach her, how her feedback gets a target, what the front records as they pass, how many work sessions run
at once, what to do on the usage limit and when work sessions collide, and how a change of
plan travels.

## Questions from a work session

A work session sends each question its skill would have asked, with the options and the
recommended pick written in the message (`<plugin-root>/references/front-contract.md`).

- **Show its visual first.** When the question asks for a review or an approval, show the
  file it sends inline with `mcp__visualize__show_widget`, or open the page, the doc or the
  canvas it links, for Athena before the dialog, by
  `<plugin-root>/references/show-for-review.md`. A review ask that arrives with no visual goes back to
  the work session for one.
- **Frame it in one line, then relay it word for word through `AskUserQuestion`**, in the
  same turn it arrives. The line, in the orchestrator's voice
  (`<plugin-root>/references/voice.md`), says which work session asks and why it is open.
  The dialog carries the question, every option the work session sent with what it does
  and what it costs, and its pick first, marked as the recommendation. Translate it into
  Athena's language when she speaks another, and change nothing else.
- **Draw a decision sheet when one arrives.** A work session sends several decisions as
  one `ss.ask` JSON with `sections` (`<plugin-root>/references/decision-sheet.md`). Frame it
  in one line, then draw the sheet with `mcp__visualize__show_widget`: every context, question,
  option and pick word for word, the pick first. Send her answer line back quoted, as it
  arrived.
- **Record it** under Waiting on Athena in the front, with the date. When she answers, the
  line moves to Log with her words quoted.
- **Send the answer back in Athena's words**, quoted, through `SendMessage` to the work
  session's `local_…` id. A pick goes back as the option's label as the work session sent
  it; free text goes back as she wrote it. A paraphrase is a second decision she did not
  make.
- **A work session that stopped on a question** shows as idle in `list_sessions`, with no
  message sent. Read its last message with `list_events`, relay the question from there,
  and send the answer as a new message.
- **A question from `/ss:assistant`** reaches this session as a message. Answer it from the
  front, and relay anything that needs Athena's decision to her here, word for word.

## Reports

- **Say each report to Athena in your own words**, by `<plugin-root>/references/voice.md`:
  what changed, what is verified and what is left, in one to three sentences, with a
  recommendation when it leaves a decision. A blocker is what stopped, what unblocks it,
  and whether she has to do anything. Raw report headings and `local_…` ids stay out of
  the chat.
- **Update the front** in the same turn: the work session's row (state and a one-line last
  report), the Repos row (PR and CI), and Next. A long report goes to the Notes tab.
- **A report is that session's claim, not proof.** Check the PR, the diff or the file
  before telling Athena a task is done.
- **A proposed project fact** goes to Athena as the exact line, through `AskUserQuestion`.
  Send her answer back quoted; the work session writes the line only after her yes, in its
  own branch.
- **A report that carries `Correction repeated:` lines** proposes a work session that
  runs the `learn` playbook on each class (`skills/go/playbooks/learn.md`), which picks a
  check, a review rule or a project fact. Bring each class to Athena as a question through `AskUserQuestion`, one question
  per class, all in one call. A work session never starts on the line alone.

## Artifacts

- **When a work session sends a doc, canvas or artifact URL**, open it for Athena in the
  same turn with the `Artifact` tool's `open` action, and name in one line what it holds,
  before relaying any question about it. The same holds for every document this session
  creates, updates or relies on, such as a doc a brief is built from: open it, never only
  paste its link (`<plugin-root>/references/show-for-review.md`, "Open every document in
  the chat"). The front doc is the one exception: it is this session's memory, opened once
  when the front is created (`<plugin-root>/references/front-doc.md`), and its routine
  updates open nothing.
- **When Athena asks to change an artifact**, read it with the `Artifact` tool's `read`
  action, apply the edit, and publish again to the same URL. An edit that needs code or the
  work session's context goes to the work session with her words quoted.
- **A design canvas** (`<plugin-root>/references/show-for-review.md`, "A mockup first, or
  the real screen"): open it, and watch it with `ArtifactComments`. Send every design change to the
  work session, the comment quoted with its artboard. When Athena approves a variation,
  send its label quoted; that approval lets the work session write code.
- **A local file** reaches Athena through `SendUserFile`, from the path the work session
  sent or from the notes folder. Name what each file shows in one line.

## Many work sessions at once

There is no fixed cap. Above four working at the same time, tell Athena before starting the
next one, in one line with the ones already running.

## The usage limit

A work session that stops on the usage limit shows its reset time in its last message.

1. Tell Athena the reset time once, in one line, for every session that stopped on it.
2. Once the reset passes, send each stopped session a message to continue.

The session tools do not wake the orchestrator at a given time, so the message goes out on
the first turn after the reset. Say so in the same line as the reset time.

## Work sessions that collide

- **Two work sessions touching the same files**: tell both, name the other and the files,
  and ask each for the smallest change that does its job. The second PR to land merges the
  base first.
- **Athena spoke to a work session directly**: what she said there stands. Read the end of
  that conversation with `list_events` before replacing the session or sending it anything
  that contradicts it.

## Feedback with a target

Athena's feedback on a work session's result often names a feeling, not a change: "I don't
like how this is shown". Before it goes to the work session, turn it into a target, by
"Feedback with a target" in `<plugin-root>/references/voice.md`:

1. **Write one concrete checklist item**: the part that changes and what it changes to,
   with her exact words quoted beside it. Send the work session both, the item and the
   quote, and record both in Log.
2. **When you can't tell what she means**, describe what the work session built in one or
   two plain lines first, from its report and its visual, then ask her one decision-sheet
   question with the most likely reading as the recommended pick. Send the answer on as
   the item, her words quoted.
3. **Never forward the vague line alone.** A work session that gets only "I don't like
   it" guesses, and the guess is a second decision she did not make.

## A change of plan

- **Relay a correction at once**, in Athena's words, and record it in Log. A work session
  that keeps building on the old plan wastes the work after the correction.
- **Change the goal in the front** only with her words quoted.
- **Pausing a work session** means it stops with no PR and keeps what it did, committed on
  its branch or written to the notes folder, so it can resume.

## Sessions from before the front

A session that existed before `/ss:orchestrate` started does not become a work session. Ask
it for a hand-over summary (what it did, what is left, its branch and PR), start a new work
session with that summary in the brief, and once the new one has started, archive the old
one by `references/cleanup.md`.
