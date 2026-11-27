---
name: shape
description: Align on the idea before building. Develops a draft, iterates the gray areas of what gets built with you through the question tool, maps the expected behavior (happy path plus edges) and converges on acceptance criteria as WHEN/THEN lines, written into the brief or front doc the caller names, or into chat. Closes at a gate that offers to build it now in this session or to stop here. Use when the user says "shape this", "let's plan", "what should we build", "let's discuss before building", "write the acceptance criteria", "what are the edge cases", or starts a non trivial feature. Don't use it for small mechanical changes (just do those) or to find bugs (use /ss:review).
license: MIT
metadata:
  author: Athena Briana - github.com/athenabriana
  version: 5.0.0
---

# Shape

Reach a **shared understanding of the idea before any code**. What matters is the alignment; the acceptance criteria are where it lands: `WHEN … THEN …` lines a person reads to know what gets built, and that the build and the review check against. You and the model converge on what you're building, then build fast against it.

> The point was never a template; it was building context and discussing before building. The criteria keep that: the converged conversation, written down for whoever builds from it.

**The criteria describe what gets built**: the business rules, the expected behavior and, when it helps, the order the work runs in. The technical details are the builder's, settled while building with the code open. A technical risk you see is named in `Attention points`, with where it lives and no solution.

## Auto-size by complexity

- **Tiny** (≤3 files, one obvious change): skip shaping; just build it.
- **Medium** (a clear feature): the loop (gray areas of what gets built + the behavior map), then the criteria and the gate.
- **Large / fuzzy** (new domain, real ambiguity): the same loop, with the pieces and how they fit described in the draft before the work is ordered, then the criteria and the gate.

Always required: reach alignment, **map the behavior**, and end at criteria the user signed off on. Size is judged as the work goes, not locked at the start. If a "Tiny/Medium" task keeps surfacing gray areas mid-flow, re-size up and shape it properly.

## The loop

You bring the idea; Claude develops it, then loops with you through the **`AskUserQuestion` tool** until the picture is consistent and you sign off. Never interrogate from a blank page, and never decide silently; drive it through real questions. In a front, every one of them (the gate included) goes through `<plugin-root>/references/front-contract.md` instead of a local dialog, and a brief that already states what follows the shaping answers the gate.

1. **Develop the draft (draft-first).** Read the one-liner, look at the codebase, and write a short draft with your best guesses filled in: what/why, the business rules, the scope edges, the behavior you expect. For Large work, also describe the pieces and how they fit. Bring something concrete to react to.

   **Research first when the draft needs outside facts.** When the draft depends on facts the repo does not hold (how others build something, a library nobody here has used, a UI pattern), run `/ss:research` on the idea before writing the draft, with no path, so the report comes back into this session. Decide it alone: say in one line that the research runs first, and ask nothing. The draft is written on top of the report, citing it, and its open section feeds the gray areas. An idea the repo already covers drafts as before.

   **Pull real UI references when the work has a UI.** Before the draft, gather three to six real screens that solve the same pattern, by `<plugin-root>/references/ui-references.md` (Inspo and Awwwards MCP first, then live sites, then `/ss:research`'s visual front, offering to set up a source that is missing), and decide it alone, saying in one line which source they came from. The draft cites them where they shape a choice, they show beside the interface at the exit gate, and they travel with the brief or front doc so the build and the critic get the same set.

2. **Highest-stakes question first, ask before you anchor.** On the single call most expensive to get wrong about what gets built, ask the user how _they'd_ call it _before_ you reveal your own pick (an open `AskUserQuestion`). Anchoring is strongest on the choice that matters most. Don't pre-frame that one. One question only; everything else stays draft-first.

3. **Surface the gray areas as questions.** Everything else about what gets built and how it behaves that genuinely could go more than one way → ask via `AskUserQuestion`, batched (the tool takes up to 4 at once), each as concrete options with your lean. A batch of two or more, or a question that needs a line of context, goes in one decision sheet (`<plugin-root>/references/decision-sheet.md`). Decide the obvious yourself; don't ask about what the codebase or goal already settles. A technical detail is the builder's and is not asked. The exception is a technical choice only the user can make, like a stack already settled elsewhere or a contract another system depends on: ask it.

4. **Loop.** Fold each answer into the draft, re-surface anything new it opens, ask again. Keep going until a round surfaces no new gray areas.

5. **Order the work, when it helps.** For work with more than one step, list the steps in the order they run, by what depends on what: a foundation first, then the steps that only need it (mark the ones that change different parts of the code and can run side by side, each in its own `Agent` subagent), then a closing step that needs all of them. A step that fixes a bug names how the failure shows today (the command, the test, or the steps), so the build proves it fails before the fix and passes after.

6. **Write the criteria.** Described in "Write the criteria" below.

7. **The exit gate.** Described in its own section below.

Size the ask to the stakes: cheap-to-reverse decisions lead with your pick (the user vetoes if wrong); expensive-to-undo ones lay the options out and let them choose. Full playbook in `references/draft-first.md`.

## Map the behavior (required for Medium+)

The behaviors are what guarantee the built thing matches the idea. An unmapped behavior is an unverified assumption about the final result; the completeness of this map is the fidelity between idea and outcome.

- **Happy path**: walk the main flow step by step and concretely: input → what happens → observable output. Every step the flow really takes gets a line.
- **Edge cases**: every deviation that changes the outcome for the user, each with its **expected outcome**: empty / zero / huge input, invalid input, first-run vs repeat, concurrent use, failure & rollback, denied permission/auth, partial or interrupted runs, migrating existing data. Map the _outcome_, not just that the case exists.

Each behavior becomes one `WHEN <case> THEN <observable outcome>` line, so each line reads directly as a test. Walking each behavior surfaces calls you haven't made; those go back into the loop as gray areas. **A behavior with no decided outcome is an open item the gate blocks on.** Litmus for whether an edge's outcome is load-bearing (not just a minor case): **does its outcome contradict the `why`?** If choosing the wrong outcome would make the built thing betray its own reason for existing, it's load-bearing, and the gate blocks on it. This map is the acceptance criteria: `/ss:review`'s `contract` front checks the branch against them line by line, reading them from the brief or the PR body.

## Write the criteria

The converged draft lands as one block, written where the caller said:

- **A path the caller gave** (a brief file, a front doc): write the block there. A block from an earlier round in the same place is replaced whole, never kept beside the new one.
- **No path**: write the block into chat, as the last thing before the gate.

Shape creates no other file and commits nothing.

```markdown
## Acceptance criteria

- WHEN <case> THEN <observable outcome>
- WHEN <case> THEN <observable outcome>

## Decisions

- <a business rule or a call closed with the user, in the words of the product>

## Work, in order

1. <foundation step>
2. <step> · <step> (side by side)
3. <closing step>

## Attention points

- <a technical risk, and where it lives in the code>

## Out of scope

- <a hard line, or an idea parked for later>
```

`## Acceptance criteria` is always there. The other sections appear only when they carry something: Decisions when the loop closed calls the criteria do not already state, the work order for work with more than one step, attention points when you saw a risk, out of scope when the loop drew a line.

**The block describes what to build; it doesn't recount how you got there.** What you first assumed, what a later read corrected, which message settled it: none of that goes in. Say each thing once: a fact that appears in a decision and again in a criterion is one fact and two copies to keep in sync. Name things the way the repo names them, because the criteria's words become the words of the build.

**Attention points name the risk, not the fix.** One bullet each: the technical risk and where it lives (the file, the function, the tool whose limit it runs into). The solution is the builder's, decided with the code open. A bullet that carries a fix has turned back into a technical decision the criteria do not make: cut the fix and keep the risk.

## The exit gate

Don't gate blind: first **show what the user is signing off on**, as a visual built before the question, by `<plugin-root>/references/show-for-review.md`: the block as a private Claude Docs doc opened for them (or the brief or front doc it was written to, opened for them), and an interface on a Design canvas. A change to criteria already signed off shows the old lines next to the new ones. Show it in the order a person reads to understand what gets built:

- **What it does and why**: two or three lines.
- **The load-bearing criteria**: only the `WHEN … THEN …` lines whose wrong outcome would contradict the `why` (the litmus in "Map the behavior"), then where the rest were written.
- **The work, in order**, when there is more than one step.
- **What is still open**.

### When something load-bearing is open

Do NOT offer to build. Ask one `AskUserQuestion` whose options are **resolve it now**, **defer it explicitly** ("decide while building", recorded as such under `## Decisions`) and **Stop here**. Never a silent "build anyway". What the user settles goes into the block, and the gate reopens.

### When nothing load-bearing is open

Ask one `AskUserQuestion` (the format in the plugin-level `references/handoff-gate.md`):

- **Build it now (Recommended)**: this session does the work against the criteria, splitting it across `Agent` subagents where the steps run side by side, then offers `/ss:ship`.
- **Stop here**: the criteria stay where they were written; the user builds later.

The user can answer with an adjustment instead (the tool's free-text option). A change made at the gate is folded into the block, and the gate reopens. A `Build it now` pick is the affirmative start, not a silent roll-through.

## Don't fabricate

Before asserting how something works: check the codebase, then its docs, then the web (the research report, when the idea needed one); if you still don't know, **say so**. A wrong assumption here cascades into the build, and a draft full of confident guesses is worse than one that flags what it's unsure of. Uncertainty flagged beats confidence invented.

## Hand off: the gate decides whether to roll on

Shape always ends at acceptance criteria the user signed off on; they are the durable asset either way. The step from shaping to building is a checkpoint the user crosses on purpose, not a stop.

- **Build it now:** the session builds against the criteria, step by step in the order written, with an `Agent` subagent per step where steps run side by side. When the work is done, it offers `/ss:ship` and stops there; the ship runs only on the user's pick.
- **Stop here:** say the next step plainly: where the criteria were written, and that a later session builds from them and lands the branch with `/ss:ship`.

**Safety valve:** if building reveals that a business rule or a behavior is missing, or contradicts another, the build stops and comes back here to re-shape. That's the signal alignment was incomplete. A technical gap is not: the builder settles it and says what it chose.

## Bundled resources

### references/draft-first.md

The draft-first playbook: what a draft must cover, and how to surface the gray areas of what gets built as tool questions with a recommended pick instead of a wall of open prompts.
