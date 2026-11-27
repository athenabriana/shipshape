# The exit gate, when clarify runs on its own

Clarify reads this at step 8, when it runs on its own and no caller's loop follows.
Bare `goal-loop.md` names `<plugin-root>/references/goal-loop.md`.

First **show what the person is signing off on**, as a visual built before the question, by
`<plugin-root>/references/show-for-review.md`: the goals doc opened for them when the work
is big (or the brief or front doc the goals were written to, opened for them), else the
block as an inline visual in the chat, and an interface on a Design canvas. Show what it
does and why in two or three lines, the load-bearing goals, the work in order, and what is
still open.

- **When something load-bearing is open**, do not offer to build. Ask one `AskUserQuestion`
  whose options are **resolve it now**, **defer it explicitly** (recorded under
  `## Decisions` as "decide while building") and **Stop here**.
- **When nothing load-bearing is open**, ask one `AskUserQuestion` (the format in
  `<plugin-root>/references/handoff-gate.md`):
  - **Build it now (Recommended)**: this session builds against the goals, with `Agent`
    subagents where steps run side by side, runs the goal loop of `goal-loop.md` until every
    goal is achieved and the judge is pleased, then offers `/ss:ship`.
  - **Stop here**: the goals stay where they were written; a later session builds from them
    and lands the branch with `/ss:ship`.

A change made at the gate is folded into the block, and the gate reopens.
