---
name: clarify
description: Clarifies the goals before work starts and owns every ask that gets alignment, as the goal loop's first step. Maps the problem and the code, proposes verifiable goals as numbered WHEN/THEN lines with their checks and what is out of scope, and asks once, in the form the work calls for, the question tool for one quick pick, a decision sheet for more, a private Claude Docs doc when the work is big (several PRs, repos or fronts, other readers, revisited over days, or too much for one sheet). /ss:go, /ss:orchestrate, /ss:review, /ss:ui-critique and /ss:edge-cases hand it their open questions. Hands the goals back to the caller, or on its own offers to build or stop. Use when the user says "clarify", "clarify the goals", "esclarece", "esclarece os objetivos", "scope this", "define the scope", "qual o escopo", "define os objetivos", "shape this", "let's plan", "what should we build", "let's discuss before building", "write the acceptance criteria", "what are the edge cases", or starts a non trivial feature. Don't use it for small mechanical changes (just do those) or to find bugs (use /ss:review).
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

Clarify is also the one owner of getting alignment before work: it asks the person, or
writes the Claude doc they read, and no other skill builds its own opening ask. A caller
hands its open questions to clarify, and clarify picks the form (below) and asks them all
at once, beside the goals.

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
  the goals go. Clarify returns the approved goals to the caller and has no exit gate: the
  caller's loop is what follows.
- **A caller with open questions before work**: `/ss:go`'s endpoint and route questions,
  `/ss:ui-critique`'s opening blocks (mockup or real screen, a cap, the goals'
  contradictions), `/ss:edge-cases`' rows with no known outcome, `/ss:orchestrate`'s front
  goal. The caller passes its blocks, each with a default; clarify asks them in the one
  form it picks and returns the answers.
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

## Pick the form: a dialog, a sheet or a doc

The form follows what is being settled, by `<plugin-root>/references/decision-sheet.md`
and `<plugin-root>/references/show-for-review.md`:

- **The question tool** (`AskUserQuestion`): one decision whose options speak for
  themselves.
- **One decision sheet**: two or more decisions, a decision that needs a line of context,
  or one that needs typed details (a reason, a name, a date).
- **A private Claude Docs doc, then one sheet (or the dialog) for what it leaves open**:
  big work, by the threshold below.

- **Between the dialog and a sheet, pick the sheet.**
- **A caller's document is the doc.** When the caller names a front doc, a brief or a PR
  description as the path, the goals go there and no second doc is made.
- **A size is never a duration.** The thresholds count goals, decisions, PRs and sessions;
  no ask carries a time estimate or asks for a deadline.
- **A merge ask is not clarify's.** The session that holds the PR asks it with the question
  tool, by the merge rule.
- **In a front**, every ask (the gate included) goes through
  `<plugin-root>/references/front-contract.md` instead of a local dialog: a sheet as its
  `ss.ask` JSON, a doc as its URL with one line. A brief that already states what follows
  answers the gate.

### When the goals get a doc

Write the goals into a doc when **any** of these holds:

- **The work spans several PRs, repos or fronts.**
- **Other people will read it**: a proposal, a spec for the team.
- **The person will come back to it over several days**, to check where the work stands.
- **The goals and their context do not fit one decision sheet.**

Otherwise the goals go in a decision sheet in chat (or the dialog, for one quick pick).
Check the threshold once the goals are drafted (step 4), and again when the work re-sizes.
The test counts PRs, repos, readers and goals, never hours or days of work.

### What the doc holds

The doc is titled `ss goals · <subject>`, the subject in two to five words of the request.
It holds these sections, in this order:

```markdown
# ss goals · <subject>

## Goal

"<the person's request, in their own words>"

## Goals

- G1 WHEN <case> THEN <observable outcome> · check: <test, command, screenshot or source> · status: open
- G2 WHEN <case> THEN <observable outcome> · check: <...> · status: open

## Out of scope

- <a hard line, or an idea parked for later>

## Open decisions

- <the decision> · options: <a>, <b> · default: <a>

## Decisions

- <a decision closed with the person, in the words of the product>

## Work

- <PR, branch or commit link> · <what it carries> · <open, merged>
```

- **Status** is `open`, `achieved`, `not achieved: <what is missing>` or
  `deferred: <ground>`. The goal loop updates it each round, by
  `<plugin-root>/references/goal-loop.md`.
- **Open decisions are asked in chat too.** The decision sheet that follows the doc carries
  "Approve these goals" first and every open decision, so the person answers in one place.
  Each answer moves from `## Open decisions` to `## Decisions` in the doc.
- **`## Work` starts empty**, and the session that builds adds each PR, branch or commit as
  it lands.
- `## Work, in order` and `## Attention points`, from the goals block below, join when they
  carry something.

To write it:

1. **Load the Docs tools.** Call `ToolSearch` with the bare names (`create`, `batch`,
   `update`, `read`, `guide`), or load the `anthropic-skills:docs` skill. Before the first
   write, call `guide` with `topic.instructions` and follow it for the payload shapes.
2. **Create the doc** with the sections above. It is private: never share it and never
   change its sharing. Write no secret, token or credential into it.
3. **Open it in the chat** with the `Artifact` tool's `open` action in the same turn, with
   one line on what it holds, by "Open every document in the chat" in
   `<plugin-root>/references/show-for-review.md`. Then ask the sheet.
4. **Record the doc's URL** in the loop folder's `state.json` (`goals_doc`), creating the
   file when the loop has not started yet, so the loop and a restart find it.

In a work session, which has no chat with the person, the URL goes to the orchestrator
with one line on what the doc holds, by `<plugin-root>/references/front-contract.md`; the
orchestrator opens it before it relays the sheet.

### Called by `/ss:orchestrate`: the front doc

A front's goals live in its front doc (`<plugin-root>/references/front-doc.md`). When
`/ss:orchestrate` calls clarify, the goal goes into the Now tab's `## Goal` and the goals
into its `## Acceptance criteria`, and clarify creates no doc of its own. A goals doc is
for work outside a front, and the two stay distinct.

### No Docs connector

When the Docs tools are missing, write the same structure to `goals.md` in the loop folder
(the notes folder the brief names, else `~/.ss/runs/<slug>/`, by `goal-loop.md` section 9),
send it with `SendUserFile` and `display: "render"`, and say in one line that the Docs
connector was missing. The sheet in chat follows, as with a doc, and the loop reads and
updates the file as it would the doc.

## The steps

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

6. **Ask once**, in the form picked above. For big work, the doc is written and opened
   first, by "What the doc holds", and the sheet follows it. The ask carries the goals
   block ("Approve these goals" first, editable in the same answer), the out of scope
   block, every block a caller handed over, and every gray area of what gets built that
   genuinely could go more than one way, each with concrete options and your pick first, by `goal-loop.md` section 3 and `<plugin-root>/references/long-run.md`. On
   the single call most expensive to get wrong, give the options without marking your
   pick, so the answer is the person's own. A technical detail is the builder's and is not
   asked, unless only the person can make it (a stack settled elsewhere, a contract another
   system depends on). The promise goes in the sheet's header line or the dialog: after
   this, the run goes to the end and asks again only on a real blocker.

7. **Fold the answers in.** An answer that opens a new load-bearing gray area is a real
   blocker: ask that one, then continue. Everything else is decided and recorded.

8. **Write the goals** where the caller said (below), then hand them over, or open the exit
   gate when clarify runs on its own.

## Write the goals

The approved goals land as one block, written where the caller said:

- **A path the caller gave** (a brief file, a front doc, a PR description): write the block
  there. A block from an earlier round in the same place is replaced whole.
- **No path, and the work is big**: the goals doc, by "What the doc holds", opened for the
  person (or `goals.md` when the Docs connector is missing).
- **No path otherwise**: write the block into chat, as the last thing before the gate or
  the hand-off.

Clarify creates no other file (beyond `goals.md` without the Docs connector) and commits
nothing.

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

## The exit gate, when clarify runs on its own

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

## Don't fabricate

Before asserting how something works: check the codebase, then its docs, then the web (the
research report, when the idea needed one); if you still don't know, **say so**. A goal built
on a confident guess sends the whole loop the wrong way.

## Safety valve

When building reveals that a business rule or a behavior is missing, or contradicts another,
the build stops and comes back here to clarify the goals again: that is a goal that was wrong, a real
blocker by `long-run.md`. A technical gap is not: the builder settles it and says what it
chose.

## Bundled resources

### references/draft-first.md

The draft-first playbook: what a draft must cover, and how to surface the gray areas of what
gets built as questions with a recommended pick instead of a wall of open prompts.
