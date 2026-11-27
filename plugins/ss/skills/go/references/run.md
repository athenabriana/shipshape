# Running a playbook

Step 3 of `/ss:go` (run it) reads this page before the first step of the matched playbook.
Each rule below holds for the whole run.

- **Todo list.** Copy the playbook's steps into the session's todo list, word for word, and
  tick each as it finishes. A step is done only with the evidence it asks for.
- **Ask once, then run long.** When the goal is clear, gather every open question before
  the first step and ask them together, in one decision sheet with a default on each,
  by `<plugin-root>/references/long-run.md`. The endpoint, when the person left it open,
  is one of its blocks: a local commit, a pushed branch, or an open PR. A work session
  reads the endpoint from its brief; when the brief leaves it open, it stops at a local
  commit and says so in its report. After the answers, run every step to the endpoint
  without asking: no "should I continue?", no stop between steps. Ask again only on a
  real blocker as that page defines it, and stop at a clean step when the person's cap is
  reached or the usage window runs low.
- **Interface work runs on real visuals.** A change the person sees is checked on
  screenshots of the running thing, through the browser or app tools at hand, and goes
  through the design-review loop of `<plugin-root>/references/design-loop.md` until the
  critic is pleased and the goals are achieved. Whether to start on a mockup (recommended)
  or the real screen is the person's pick, one block of the opening sheet when they have
  not said, by `<plugin-root>/references/show-for-review.md`.
- **Preservation check before every commit.** Reread the staged diff: nothing unrelated
  changed, nothing removed the task did not ask to remove.
- **Subagents.** Split independent work with `Agent` subagents, each with a standalone brief:
  goal, repo, worktree, branch, acceptance criteria, limits. They cannot ask anyone: they
  return their questions, and you ask them through the question tool, or a decision sheet
  for anything bigger than one quick pick (`<plugin-root>/references/decision-sheet.md`).
- **In a work session** (a session whose brief says an orchestrator started it), the
  question tool is the orchestrator: `SendMessage` the question with its options and your
  pick, or a decision sheet as its `ss.ask` JSON, then end the turn. A work session never starts sessions.
- **Show it before asking for a review.** Every review or approval ask comes with a visual
  built before the question, in the form `<plugin-root>/references/show-for-review.md`
  picks: an inline visual in the chat by default, else a Design canvas or an Artifact
  page. Only `/ss:clarify` creates a Claude Docs doc.
- **After a compaction**, reread the todo list, and the brief if there is one, and pick up at
  the first unticked step.
