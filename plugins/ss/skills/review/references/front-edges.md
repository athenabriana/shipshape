# Front: edges, the inputs the diff does not handle

Hunts the edge cases a diff misses, category by category, with the walk of
`<plugin-root>/skills/clarify/references/edge-categories.md` read over code instead of a
plan. The `correctness` front reads the diff for bugs in general; this front asks one
narrower question per category: which input that reaches this code gets a wrong outcome.

## When it runs

- **Named:** "edge cases", "what could break", "corner cases", "test the edges", "casos de
  borda", "o que pode quebrar", or `/ss:review edges`. That is a direct front ask (step 1
  of `SKILL.md`): this front alone, over the branch or the PR named.
- **Deep:** every deep run picks it with the other fronts.
- **The bug-fix intensive route:** the bug-fix skill's review step names it beside deep.

It runs on the current branch only. An external PR does not offer it, since reading the
callers needs a checkout. An ask with no diff (a plan, a feature not built yet, a function
on a clean tree) is not this front's: it goes to `/ss:clarify`, whose behavior map walks the
same categories.

A standard run without either leaves it unoffered, since `correctness` already covers
edges at that depth.

## Resolve the reach

Read each touched function open, then list its callers (`git grep`). The callers decide
which inputs can arrive, so every candidate names the caller its input comes through.

## The slices

Split the categories the diff can reach into 3 or 4 slices, one finder each, sized by the
depth table in `fronts.md`. A category nothing in the diff can reach is dropped, and the
stats line names it. A typical split:

1. cardinality, boundaries, bad input, duplicates and ordering;
2. concurrency, partial failure, state transitions;
3. time, i18n, scale;
4. auth and tenancy, compatibility.

Cap: **8 candidates per slice**. Each carries `file`, `line` (where the wrong outcome
happens), the category, a concrete input, the caller it arrives through, and what the code
does with it.

## Proof

Every candidate goes through the verify pass as a `correctness` candidate does
(`verify.md`), the execution lane included: a candidate whose input is a concrete trigger
is decided by running it when `runnable` is true. A finder may also prove a case itself
with one throwaway check in the session's scratchpad, only when it runs in seconds with no
build and no service, and puts the command and its output in the scenario. An expected
outcome nobody decided is not a finding: it goes to the goals of the change as an open
question (`loop.md`, "The goals of the change").

## Finding shape

```
# | file:line | category | input (via caller) | what happens now | expected | suggested fix | verdict
```

A Bloqueante ships a broken outcome for a reachable input; everything else worth saying is
a Sugestão (`<plugin-root>/references/finding-levels.md`). A case on code the diff did not
touch is a Sugestão flagged pre-existing.
