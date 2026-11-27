# Handoff gate: the one convention for "what's next"

Every skill whose outcome has a natural next step ends with a **handoff gate**: a
single `AskUserQuestion` that offers the next skill(s) in the journey. The gate is
how the bundle gives the user a sense of place ("here's where you are, here's
what usually comes next") without ever deciding for them.

## Why the tool (applies to any question, not just gates)

Anything expecting an answer goes through `AskUserQuestion` for one quick pick, or
through a decision sheet for anything bigger: two or more decisions, a line of context,
or typed details (`<plugin-root>/references/decision-sheet.md`). When in doubt, the
sheet. A merge ask always uses `AskUserQuestion`. A question printed as plain text has no response path, so the
flow stalls. The tool auto-provides
an "Other" free-text option; a manual "Other"/"Change something" option is
redundant.

**The call carries what it takes to decide.** Whoever answers is looking at the
dialog, not at the transcript above it, so the reasoning has to travel inside the
call: the `question` names what is being decided and why it is open, and each
option's `description` says what that pick does next and what it costs. The
`label` is a name (1–5 words) and the `header` a chip of 12 characters, so
neither of them is where the substance goes. The test: if the answer would change
depending on something you know and did not write down, the call is incomplete.
Explaining the fork in prose and then asking "A or B" makes the person scroll
back to answer, which is the same stall as printing the question as text.

**A review or an approval shows its subject first.** When the answer rests on something
the person has to see (a design, a plan, a diff, a line to write), build the visual before
the call and put its link in the `question`, by `<plugin-root>/references/show-for-review.md`.

**In a work session** (a session `/ss:orchestrate` started), the question does not open a dialog: it goes to the orchestrator as `<plugin-root>/references/front-contract.md` describes, with the same question, options and pick.

## The rule

- **Suggest, never auto-invoke.** A gate offers; the user picks. The one exception
  is a chain the user authorized up front: a scope given at the start ("build it and
  ship it") runs each step it names without asking again, because that answer is the
  ask.
- **"Stop here" is always an option.** Picking it ends the turn; nothing is
  invoked, no follow-up question. The user is never trapped in the flow.
- **One gate per skill, at the end.** Mid-skill questions are the skill's own
  business (gray areas, confirmations); the handoff gate is the last interaction.
- **Skills without a natural next step have no gate**: they just report and stop:
  `legal-lens`, `caretake`, `takeover`, `review-setup`, `write-readme`,
  `research`, `investigate`, `babysit`, `correct`, and `orchestrate`, which stays
  resident until the person ends it.

## The format

Ask one question, or two in one call when the pick needs a setting to go with it:

- `question`: one sentence naming what just finished and asking how to follow.
- `options`: 2–4, each a next skill (or action) with a one-line description of
  what invoking it will do **now**. Lead with the recommended pick and suffix its
  label with `(Recommended)`.
- Last option: **"Stop here"**. Description says what stays saved and how to
  pick the flow back up later (the exact `/ss:<skill>` command).
- A second question, when there is one, is `multiSelect` and carries the setting,
  with no "Stop here" of its own. It counts only with the pick it sets, and the
  first question's description says so.

Example (`/ss:clarify`'s exit gate, when it runs on its own):

```
question, single choice: "Goals signed off and written to the brief. What now?"
options:
  - "Build it now (Recommended)". This session builds against the goals, with Agent subagents where steps run side by side, runs the goal loop, then offers /ss:ship.
  - "Stop here". The goals stay in the brief; a later session builds from them and lands the branch with /ss:ship.
```

## Journey map (what gates typically offer)

- `clarify` → on its own: build it now in this session, then offer ship / stop; called by a skill: no gate, the goals go back to the caller
- `go` → the playbook's next step when its scope stops short of it (review after a fix, ship after a review) / stop
- `edge-cases` → plan mode: build it now against the criteria / stop; diff mode: fix the proven cases / stop
- `ship` → on an open PR, offer `/ss:babysit` / stop; on any other destination no gate, it reports what shipped and stops
- `review` → apply more items / run the fronts that were skipped / audit the running UI / review-setup / ship (when there is no PR) · three at most, by priority, plus stop
