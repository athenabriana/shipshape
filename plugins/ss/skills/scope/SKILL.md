---
name: scope
description: Defines the goals before building, the first step of the goal loop. Maps the problem and the code, drafts what gets built with the behavior map (happy path plus edges), and proposes verifiable goals as numbered WHEN/THEN lines, each with its check, plus what is out of scope, all approved once in one decision sheet. Hands the approved goals to the caller's loop, or for a new feature on its own closes at a gate that offers to build it now or stop. Writes them into the brief or front doc the caller names, or into chat. /ss:go and other skills call it when goals are needed. Use when the user says "scope this", "define the scope", "qual o escopo", "define os objetivos", "shape this", "let's plan", "what should we build", "let's discuss before building", "write the acceptance criteria", "what are the edge cases", or starts a non trivial feature. Don't use it for small mechanical changes (just do those) or to find bugs (use /ss:review).
license: MIT
metadata:
  author: Athena Briana - github.com/athenabriana
  version: 6.0.0
---

# Scope

Define **what done means before any code**: the goals the work must reach, each one
verifiable, and the lines it must not cross. This skill is the goal-definition step of the
goal loop, `<plugin-root>/references/goal-loop.md`: it maps the problem and the code,
proposes the goals and what is out of scope, has them approved once, and hands them to the
loop that builds and judges against them. `goal-loop.md` says what a goal is and how it is
judged; this skill says how the goals are found.

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
  the goals go and whether the approval rides its own opening sheet. Scope returns the
  approved goals to the caller and has no exit gate: the caller's loop is what follows.
- **On its own**, for a new feature: the same steps, then the exit gate below.

## Auto-size by complexity

- **Tiny** (≤3 files, one obvious change): one or two goals stated in a line, approved with
  whatever else the caller asks. No draft.
- **Medium** (a clear feature): the map, the draft with the behavior map, the goals and
  one sheet.
- **Large or fuzzy** (new domain, real ambiguity): the same, with the pieces and how they
  fit described in the draft before the work is ordered.

Size is judged as the work goes, not locked at the start. When a Tiny or Medium task keeps
surfacing gray areas, re-size up.

## The steps

Every question goes through the question tool or one decision sheet, by
`<plugin-root>/references/decision-sheet.md`. In a front, every one of them (the gate
included) goes through `<plugin-root>/references/front-contract.md` instead of a local
dialog, and a brief that already states what follows answers the gate.

1. **Map the problem and the code.** Read the request in the person's own words, the
   brief, the linked spec or issue, the code the work will touch and its callers, the tests
   near it, the repo's `CLAUDE.md` (or `AGENTS.md`) with its `## Project facts`, and the
   `CODE_REVIEW_GUIDE.md` when there is one. Note what already holds: a behavior the code
   already has is a goal to keep, not one to build. The map is a few lines in the session's
   notes: the points the work must answer, each with where it lives (`file:line`, a URL, a
   screen).

   **Research first when the draft needs outside facts.** When the work depends on facts
   the repo does not hold (how others build something, a library nobody here has used, a
   UI pattern), run `/ss:research` on the idea first, with no path, so the report comes
   back into this session. Decide it alone and say so in one line. The draft cites it, and
   its open section feeds the gray areas.

   **Pull real UI references when the work has a UI.** Gather three to six real screens
   that solve the same pattern, by `<plugin-root>/references/ui-references.md`, and say in
   one line which source they came from. The draft cites them where they shape a choice,
   and they travel with the goals so the build and the critic get the same set.

2. **Draft with your best guesses filled in.** What and why, the business rules, the scope
   edges, the behavior you expect. Bring something concrete to react to, by
   `references/draft-first.md`.

3. **Map the behavior.** Walk the happy path step by step (input, what happens, observable
   output) and every edge that changes the outcome for the user: empty, zero or huge input,
   invalid input, first run and repeat, concurrent use, failure and rollback, denied
   permission, partial runs, existing data. `/ss:edge-cases` in plan mode can walk the
   categories; its load-bearing rows come back as candidate goals. Map the outcome, not
   only that the case exists.

4. **Propose the goals**, in the form of `goal-loop.md` section 2: numbered `G1`, `G2`, …,
   one `WHEN <case> THEN <observable outcome>` line each, with its check (a test, a
   command and its output, a screenshot of a named state, or a cited source), and the
   deferred ones with their grounds. A request, a brief or a spec that already states
   WHEN/THEN criteria supplies the goals as written; add only what they leave out, and
   mark what you added. Keep them few and load-bearing: a goal per point the work must
   answer. A goal is **load-bearing** when its wrong outcome would contradict the `why`;
   those go first. Add the standing goals of the kind of work: WCAG AA on an interface,
   the review gate on a PR.

5. **Name what is out of scope**: the hard lines, and the ideas parked for later.

6. **Ask once.** One decision sheet carries the goals block ("Approve these goals"
   first, editable in the same answer), the out of scope block, and every gray area of what
   gets built that genuinely could go more than one way, each with concrete options and your
   pick first, by `goal-loop.md` section 3 and `<plugin-root>/references/long-run.md`. On
   the single call most expensive to get wrong, give the options without marking your
   pick, so the answer is the person's own. A technical detail is the builder's and is not
   asked, unless only the person can make it (a stack settled elsewhere, a contract another
   system depends on). When a caller has an opening sheet of its own, these blocks join it
   instead of opening a second one.

7. **Fold the answers in.** An answer that opens a new load-bearing gray area is a real
   blocker: ask that one, then continue. Everything else is decided and recorded.

8. **Write the goals** where the caller said (below), then hand them over, or open the exit
   gate when scope runs on its own.

## Write the goals

The approved goals land as one block, written where the caller said:

- **A path the caller gave** (a brief file, a front doc, a PR description): write the block
  there. A block from an earlier round in the same place is replaced whole.
- **No path**: write the block into chat, as the last thing before the gate or the hand-off.

Scope creates no other file and commits nothing.

```markdown
## Goals

- G1 WHEN <case> THEN <observable outcome> · check: <test, command, screenshot or source>
- G2 WHEN <case> THEN <observable outcome> · check: <test, command, screenshot or source>

## Out of scope

- <a hard line, or an idea parked for later>

## Decisions

- <a business rule or a call closed with the person, in the words of the product>

## Work, in order

1. <foundation step>
2. <step> · <step> (side by side)
3. <closing step>

## Attention points

- <a technical risk, and where it lives in the code>
```

`## Goals` is always there. The other sections appear only when they carry something.

**The block describes what to build, not how you got there.** Say each thing once, and name
things the way the repo names them, because the goals' words become the words of the build.

**Attention points name the risk, not the fix.** One bullet each: the technical risk and
where it lives. The solution is the builder's, decided with the code open.

## The exit gate, when scope runs on its own

First **show what the person is signing off on**, as a visual built before the question, by
`<plugin-root>/references/show-for-review.md`: the block as a private Claude Docs doc opened
for them (or the brief or front doc it was written to, opened for them), and an interface on
a Design canvas. Show what it does and why in two or three lines, the load-bearing goals,
the work in order, and what is still open.

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

## Don't fabricate

Before asserting how something works: check the codebase, then its docs, then the web (the
research report, when the idea needed one); if you still don't know, **say so**. A goal built
on a confident guess sends the whole loop the wrong way.

## Safety valve

When building reveals that a business rule or a behavior is missing, or contradicts another,
the build stops and comes back here to re-scope: that is a goal that was wrong, a real
blocker by `long-run.md`. A technical gap is not: the builder settles it and says what it
chose.

## Bundled resources

### references/draft-first.md

The draft-first playbook: what a draft must cover, and how to surface the gray areas of what
gets built as questions with a recommended pick instead of a wall of open prompts.
