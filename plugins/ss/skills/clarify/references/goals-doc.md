# The goals doc: when, what it holds, and how to write it

Clarify reads this at step 4, to check the doc threshold, and at step 6, to write the doc
before the sheet. `/ss:orchestrate` calls land in "The front doc, when `/ss:orchestrate`
calls". Bare `goal-loop.md`, `front-doc.md` and `front-contract.md` name the files in
`<plugin-root>/references/`.

## Contents

- A sheet or a doc
- When the goals get a doc
- What the doc holds
- The front doc, when `/ss:orchestrate` calls
- No Docs tools

## A sheet or a doc

The goals are approved in one decision sheet, by
`<plugin-root>/references/decision-sheet.md`. For big work, clarify writes them into a
private Claude Docs doc first, and the sheet follows it. The sections below say when, what
the doc holds, how the front doc differs, and what to do without the Docs tools.

## When the goals get a doc

Write the goals into a doc when **any** of these holds (when `/ss:orchestrate` calls, the
front doc is that doc, by "The front doc, when `/ss:orchestrate` calls"):

- **The work spans several PRs, repos or fronts.**
- **Other people will read it**: a proposal, a spec for the team.
- **The person will come back to it across several sessions**, to check where the work
  stands.
- **The goals and their context do not fit one decision sheet.**

Otherwise the goals go in a decision sheet in chat (or the dialog, for one quick pick).
Check the threshold once the goals are drafted (step 4), and again when the work re-sizes.
The test counts PRs, repos, readers, sessions and goals, never hours or days of work.

## What the doc holds

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

- <a business rule or a call closed with the person, in the words of the product>

## Work, in order

1. <foundation step>

## Attention points

- <a technical risk, and where it lives in the code>

## PRs and commits

- <PR, branch or commit link> · <what it carries> · <open, merged>
```

`## Goal`, `## Goals` and `## PRs and commits` are always there; the other sections appear
only when they carry something. The sections they share with the goals block in `goals-block.md` mean
the same there.

- **Status** starts as `open`. The goal loop updates it each round, with the values in
  "Goals that live in a doc" in `<plugin-root>/references/goal-loop.md`.
- **Open decisions are asked in chat too.** The decision sheet that follows the doc carries
  "Approve these goals" first and every open decision, so the person answers in one place.
  Each answer moves from `## Open decisions` to `## Decisions` in the doc.
- **`## PRs and commits` starts empty**, and the session that builds adds each PR, branch
  or commit as it lands.

To write it:

1. **Load the Docs tools.** Call `ToolSearch` with the bare names (`create`, `batch`,
   `update`, `read`, `guide`), or load the `anthropic-skills:docs` skill. Before the first
   write, call `guide` with `topic.instructions` and follow it for the payload shapes.
2. **Create the doc** with the sections above. It is private: never share it and never
   change its sharing. Write no secret, token or credential into it.
3. **Open it in the chat** with the `Artifact` tool's `open` action in the same turn, with
   one line on what it holds, by "Open every document in the chat" in
   `<plugin-root>/references/show-for-review.md`. Then ask the sheet.
4. **Hand the doc's URL to the caller** with the approved goals. The loop records it in
   `state.json` as `goals_doc`, by `goal-loop.md` section 9, and the brief or the PR
   description the caller writes links it.

In a work session, which has no chat with the person, the URL goes to the orchestrator
with one line on what the doc holds, by `<plugin-root>/references/front-contract.md`; the
orchestrator opens it before it relays the sheet.

## The front doc, when `/ss:orchestrate` calls

A front's goals live in its front doc (`<plugin-root>/references/front-doc.md`), and clarify
creates it. When `/ss:orchestrate` calls clarify to open a front:

1. **Pick the home and the slug**, by "Pick a slug no home holds" in `front-doc.md`: a doc
   front when the Docs tools load, a file front otherwise, said in one line.
2. **Create the front**, by "Open a doc front" or "Open a file front" in `front-doc.md`,
   pointer included, and open a doc front for the person.
3. **Write the opening sections** of the Now tab (or `NOW.md`): `## Goal` in the person's
   words, the approved goals as `## Acceptance criteria`, and `## Out of scope`. Each
   decision closed in the ask goes to the Log as a dated entry with the person's words.

From there `/ss:orchestrate` keeps the front's running state up to date, and no goals doc
is made: the front doc and a goals doc stay distinct, the goals doc being for work outside
a front.

## No Docs tools

When `ToolSearch` finds no Docs tools, write the same structure to `goals.md` in the notes
folder the brief names, else in the loop folder (`~/.ss/runs/<slug>/`, by `goal-loop.md`
section 9). Send it with `SendUserFile` and `display: "render"`, and say in one line that
the Docs connector was missing. A work session sends the path to the orchestrator instead,
which sends the file. The sheet in chat follows, as with a doc, and the loop reads and
updates `goals.md` as it would the doc.
