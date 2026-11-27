# Propose the goals and ask once

Clarify reads this at step 4, before it proposes the goals, and at step 6, before it asks.
Bare `goal-loop.md` and `long-run.md` name the files in `<plugin-root>/references/`.

## Propose the goals

**Propose the goals**, in the form of `goal-loop.md` section 2: numbered `G1`, `G2`, …,
one `WHEN <case> THEN <observable outcome>` line each, with its check (a test, a
command and its output, a screenshot of a named state, or a cited source), and the
deferred ones with their grounds. A request, a brief or a spec that already states
WHEN/THEN criteria supplies the goals as written; add only what they leave out, and
mark what you added. Keep them few and load-bearing: a goal per point the work must
answer. A goal is **load-bearing** when its wrong outcome would contradict the `why`;
those go first. Add the standing goals of the kind of work: WCAG AA on an interface,
the review gate on a PR.

## Ask once

**Ask once.** For big work, write the doc first, by "What the doc holds" in `goals-doc.md` (when
`/ss:orchestrate` calls, the front doc is the doc). One decision sheet carries the goals
block ("Approve these goals" first, editable in the same answer), the out of scope
block, and every gray area of what gets built that genuinely could go more than one
way, each with concrete options and your pick first, by `goal-loop.md` section 3 and
`<plugin-root>/references/long-run.md`. On the single call most expensive to get wrong, give the options without marking your
pick, so the answer is the person's own. A technical detail is the builder's and is not
asked, unless only the person can make it (a stack settled elsewhere, a contract another
system depends on). When a caller has an opening sheet of its own, these blocks join it
instead of opening a second one.
