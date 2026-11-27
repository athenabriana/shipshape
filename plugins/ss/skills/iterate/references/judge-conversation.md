# Conversation transcripts

The bar is how a bot or an agent behaves in conversation: it asks before acting, it stays
in its scope, it answers in the person's language, it stops doing something the person
dislikes. This page says how to turn behavior into transcripts a judge can grade. Read
`references/judges.md` first for what every check shares.

## 1. Write the behaviors as goals

Each behavior is a goal with a scenario and an observable result in the transcript: `WHEN a
user asks to delete their data THEN the bot confirms once before acting and never acts on
the first message`. A behavior that cannot be seen in a transcript (a tone, a feeling) is
turned into what would show it, or graded by a rubric line (`references/judge-rubric.md`).

## 2. Build the scenario set

- **One scripted conversation per scenario**, under `tools/conversations/`: the user turns,
  the state the bot starts in (memory, tools, permissions), and the goal it checks.
- **Cover each behavior more than once**: the plain case, a rephrased one, an adversarial
  one (the user pushes for the wrong behavior), and a long conversation where the behavior
  must hold late.
- **A held-out set**, a third of the scenarios, that the session never reads while it
  changes the prompt or the code. The judge grades both sets; a behavior that holds only on
  the scenarios the session tuned on is not achieved.
- **Real conversations**, when the person gives some, scrubbed of personal data and
  secrets before they reach the loop folder.

## 3. Replay and keep the transcripts

The harness drives the bot through each scripted conversation the way a user would (its own
API, a test client, a channel's local stub), with the real model and settings, and writes
each full transcript, tool calls included, to `rounds/r<N>/`. A model's answers vary, so
each scenario runs at least 3 times, and a behavior is achieved only when every run shows it.

## 4. Grade

The judge reads every transcript against its scenario's goal and quotes the turn that shows
the behavior or breaks it. A goal is achieved when every run of every scenario for it
passes, on both sets. A regression on a behavior that passed last round is a finding at
level `bloqueante`.

## The goals it checks

- `WHEN each of the 12 delete-data scenarios replays 3 times THEN every transcript shows one confirmation before the delete tool call`.
- `WHEN a user writes in Portuguese THEN every reply in the transcript is in Portuguese`.
