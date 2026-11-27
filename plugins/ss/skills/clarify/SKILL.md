---
name: clarify
description: Clarifies the goals before work starts, the first step of the goal loop. Maps the problem and the code, drafts what gets built, and proposes numbered WHEN/THEN goals, each with its check, plus what is out of scope, approved once in one decision sheet. For big work (several PRs, repos or fronts, other readers, revisited across sessions, or too much for one sheet) it writes a private Claude Docs doc first; it is the only skill that creates one, the front doc included. Hands the goals to the caller's loop, or on its own offers to build or stop. Use when the user says "clarify", "clarify the goals", "esclarece", "esclarece os objetivos", "scope this", "define the scope", "qual o escopo", "define os objetivos", "shape this", "let's plan", "what should we build", "let's discuss before building", "write the acceptance criteria", "what are the edge cases", or starts a non trivial feature. Don't use it for small mechanical changes (just do those) or to find bugs (use /ss:review).
license: MIT
metadata:
  author: Athena Briana - github.com/athenabriana
  version: 6.1.0
---

# Clarify

Define **what done means before any code**: the goals the work must reach, each one
verifiable, and the lines it must not cross. This skill is the goal-definition step of the
goal loop, `<plugin-root>/references/goal-loop.md`: it maps the problem and the code,
proposes the goals and what is out of scope, has them approved once, and hands them to the
loop that builds and judges against them. `goal-loop.md` says what a goal is and how it is
judged; this skill says how the goals are found.

**Clarify is the only skill that creates a Claude Docs doc**, the orchestrator's front doc
included. Every other skill asks questions, with the question tool or a decision sheet,
and calls clarify when the work needs a doc.

> The point is building context and discussing before building. The goals keep that: the
> converged conversation, written so the build and every judge after it check against the
> same lines.

**The goals describe what gets built**: the business rules, the expected behavior and,
when it helps, the order the work runs in. The technical details are the builder's,
settled while building with the code open. A technical risk you see is named in
`Attention points`, with where it lives and no solution.

## Who calls it

- **A caller that needs goals**: `/ss:go` on its standard and intensive routes, the
  `/ss:review` loop when no source holds the change's goals, `/ss:orchestrate` when it
  settles a front's goal, `/ss:ui-critique` when none are given. The caller names where
  the goals go and whether the approval rides its own opening sheet. Clarify returns the
  approved goals to the caller and has no exit gate: the caller's loop is what follows.
- **On its own**, for a new feature: the same steps, then the exit gate.

## Auto-size by complexity

- **Tiny** (≤3 files, one obvious change): one or two goals stated in a line, approved with
  whatever else the caller asks. No draft.
- **Medium** (a clear feature): the map, the draft with the behavior map, the goals and
  one sheet.
- **Large or fuzzy** (new domain, real ambiguity): the same, with the pieces and how they
  fit described in the draft before the work is ordered.

Size is judged as the work goes, not locked at the start. When a Tiny or Medium task keeps
surfacing gray areas, re-size up. At every size, "When the goals get a doc" (in
`references/goals-doc.md`, read at step 4) decides between a sheet and a doc: a small change that spans two repos still gets a doc.

## A sheet or a doc

The goals are approved in one decision sheet, by
`<plugin-root>/references/decision-sheet.md`. For big work (several PRs, repos or fronts,
other readers, revisited across sessions, or too much for one sheet), clarify writes them
into a private Claude Docs doc first, and the sheet follows it. Read
`references/goals-doc.md` at step 4 and step 6: it holds "When the goals get a doc", "What
the doc holds" (the template and how to write it), "The front doc, when `/ss:orchestrate`
calls" and "No Docs tools". The doc is private: never share it and never change its
sharing, and write no secret, token or credential into it.

## The steps

Every question goes through the question tool or one decision sheet, by
`<plugin-root>/references/decision-sheet.md`, after the goals doc when the work is big. In
a front, every one of them (the gate included) goes through
`<plugin-root>/references/front-contract.md` instead of a local dialog, and a brief that
already states what follows answers the gate.

1. **Map the problem and the code**: the request, the brief, the code and its callers, the
   tests, `CLAUDE.md` with its `## Project facts`. Run `/ss:research` first when the draft
   needs outside facts, and pull real UI references when the work has a UI. Read
   `references/map-the-work.md` before this step.
2. **Draft with your best guesses filled in.** What and why, the business rules, the scope
   edges, the behavior you expect. Bring something concrete to react to, by
   `references/draft-first.md`.
3. **Map the behavior.** Walk the happy path step by step (input, what happens, observable
   output) and every edge that changes the outcome for the user: empty, zero or huge input,
   invalid input, first run and repeat, concurrent use, failure and rollback, denied
   permission, partial runs, existing data. Walk the categories of
   `references/edge-categories.md`; its load-bearing rows come back as candidate goals.
   Map the outcome, not only that the case exists.
4. **Propose the goals**: numbered `G1`, `G2`, …, one `WHEN <case> THEN <observable
outcome>` line each with its check, few and load-bearing first. Read
   `references/goals-and-ask.md` before this step, and check the doc threshold in
   `references/goals-doc.md`.
5. **Name what is out of scope**: the hard lines, and the ideas parked for later.
6. **Ask once.** For big work, write the doc first, by "What the doc holds" in
   `references/goals-doc.md`. One decision sheet carries the goals, the out of scope block
   and every real gray area of what gets built, by "Ask once" in
   `references/goals-and-ask.md`.
7. **Fold the answers in.** An answer that opens a new load-bearing gray area is a real
   blocker: ask that one, then continue. Everything else is decided and recorded.
8. **Write the goals** where the caller said, by `references/goals-block.md`, then hand them
   over, or open the exit gate when clarify runs on its own, by `references/exit-gate.md`.
   Clarify creates no other file (beyond `goals.md`) and commits nothing.

## The exit gate, when clarify runs on its own

Show what the person is signing off on, then ask one `AskUserQuestion`, by
`references/exit-gate.md`. When something load-bearing is open, do not offer to build:
offer to resolve it now, defer it explicitly, or stop here. A change made at the gate is
folded into the block, and the gate reopens.

## Don't fabricate

Before asserting how something works: check the codebase, then its docs, then the web (the
research report, when the idea needed one); if you still don't know, **say so**. A goal built
on a confident guess sends the whole loop the wrong way.

## Safety valve

When building reveals that a business rule or a behavior is missing, or contradicts another,
the build stops and comes back here to clarify the goals again: that is a goal that was wrong, a real
blocker by `<plugin-root>/references/long-run.md`. A technical gap is not: the builder settles it and says what it
chose.

## Bundled resources

| file                            | read it                                                                                                                                                         |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `references/map-the-work.md`    | at step 1: the full map, research and UI references                                                                                                             |
| `references/draft-first.md`     | at step 2: what a draft must cover, and how to surface the gray areas of what gets built as questions with a recommended pick instead of a wall of open prompts |
| `references/edge-categories.md` | at step 3: the edge categories and the walk                                                                                                                     |
| `references/goals-and-ask.md`   | at steps 4 and 6: the goal form and the one ask                                                                                                                 |
| `references/goals-doc.md`       | at steps 4 and 6: when the goals get a doc, its template, the front doc, no Docs tools                                                                          |
| `references/goals-block.md`     | at step 8: where the approved block lands, and its template                                                                                                     |
| `references/exit-gate.md`       | at step 8, on its own: the visual and the gate options                                                                                                          |
