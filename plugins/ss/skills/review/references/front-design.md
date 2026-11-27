# Front: design, deviations from the design system the project has

Two scopes, one method:

- **Diff scope** (default inside a review): one finder over the UI the branch changed,
  static, judged against the design source the repo carries. What a code review can
  prove from the diff and the source together.
- **Surface scope** (`## Reviewing a whole surface` below): the user points at a
  folder, a set of files, or a running page and asks for a design review. Same
  criteria, wider scope, and a rendered page unlocks the checks source can't settle.

Both scopes add **the critic pass** (`## The critic pass` below): screenshots of the
running UI, judged by the `ss-design-critic` agent, very hard to please, on the tasks a
user does and the craft of every screen. A UI change is never reviewed from code alone:
the static finder reads the source, and the critic reads what the user gets.

The criteria are `design-checklist.md`, sibling of this file, shared by both scopes so
findings read the same either way. The discipline is the `rules` front's, applied to
design sources: **a finding is worth what its citation is worth**, so every finding
names what it deviates from, and one that cannot is dropped, never reported as a guess.

## 1. The design source

Resolve it before the front offers itself, in this order, keeping every rung that
resolves (they supplement each other):

1. **A token source the project itself reads**: a `tokens.json`, a stylesheet of CSS
   custom properties, or a Tailwind theme config. The file the build consumes is the
   authority on what a token is; a brand package that nothing imports is not one.
2. **The branch's visual direction**: `design/<surface>.md` plus its index, or a path
   the brief names. It supplements the token source with the intended hierarchy, components, and states for the surfaces this
   branch builds.

Nothing resolving makes the **static finder** unavailable, the same way no
`CODE_REVIEW_GUIDE.md` makes `rules` unavailable: with no source there is nothing to
cite, and the engine does not ship opinion. The critic pass needs no source: it judges
the rendered screens on their own craft, so the front still runs when the UI renders.
With neither a source nor a way to render the UI, the front is **unavailable**. The probe
(`fronts.md`) is where the decision lives, and its one line naming what would create a
source, printed before the fronts question, is the run's only mention of it: the report
carries no section for an unavailable front.

Report at the top of the front's section which sources resolved and were judged
against. The two rungs disagreeing on a value is itself a finding: a delta the
direction records that the token source never absorbed, or a source that moved past
the direction.

## 2. What's checkable

The four criteria of `design-checklist.md`, in short: **tokens** (a raw value where a
token exists), **components** (a rebuild of something the DS ships, or a component bent
past its API), **states** (interaction missing the states its component documents), and
**consistency** (the same thing done two ways inside the diff, or drift from the
branch's visual direction). The checklist carries the full definitions, the priorities,
and the boundaries with the fronts that border this one (`a11y` and `quality`, under `## What this checklist is not`); read it before finding
anything.

## Finding shape

```
# | file:line | criterion (token, component, state, consistency) | what deviates | source cited | priority | fix
```

`source cited` is the citation the discipline demands: the token file and line, the
component's path, where the states are documented, or the visual direction's section. The
priorities are the checklist's: **High**, **Medium**, **Low**. Cap 8 in diff scope; no
cap in surface scope.

## The critic pass

The critic pass runs whenever the diff touches UI or the surface is an interface, by
`<plugin-root>/references/design-loop.md`:

1. **Render it and take screenshots** of every task the change touches, each step and the
   states it passes by, at a desktop and a phone width, with the browser or app tools at
   hand (Claude in Chrome, the built-in browser, the `run` skill, the app's own
   screenshots). Load each with `ToolSearch` before calling it missing.
2. **Dispatch one critic**, `subagent_type: "ss:ss-design-critic"`, in the same message as
   the finders, with the screenshots, the tasks, the resolved design sources, the goals
   (the acceptance criteria from the brief or the PR body), the approved mockup as the
   reference when the change came from one, and the cap.
3. **Its findings join the report** under Design system, each with the critic's severity
   (`High`, `Medium`, `Low`), mapped to a level like this front's priorities
   (`<plugin-root>/references/finding-levels.md`): `High` is a Bloqueante, `Medium` and
   `Low` are Sugestões. They carry the screenshot as their citation.
4. **One judge per finding.** The critic judges its own findings: they skip the verify
   pass and the loop's `ss-review-judge`. In the review loop, a later round re-runs a fresh
   critic on new screenshots of what the fixes touched, with the open critic findings,
   in the same message as the judge.

The report carries the critic's two verdicts, `pleased` and `goals_achieved`, with each
goal's status. A Design canvas mockup under review is judged the same way: against the
screenshot of the app it rebuilds when it changes an existing screen, then on its own
craft. The full loop until both verdicts are true, with no default round limit, belongs to
the build (`<plugin-root>/references/design-loop.md`); inside `/ss:review` the critic runs
within the review loop's budget.

When nothing can render the UI, the critic pass does not run: say so in one line in the
front's section, name what was missing, and never report the front as a visual check.

## Scope discipline (diff scope)

- Only elements the diff added or changed. Pre-existing drift in a file the branch
  happens to touch is not this branch's finding: one line at the end as existing debt.
- A raw value with no token covering it is the design system's gap, not the diff's
  deviation. One closing line names the gap; it is not an item.
- When the repo's `CODE_REVIEW_GUIDE.md` itself states a design rule, a violation of it
  is a `rules` finding with the guide cited, not a duplicate here. This front judges
  against the design sources; the guide stays the `rules` front's.

## Reviewing a whole surface

When the ask names a **surface** instead of a branch (a folder, a file set, a URL, a
running page: "design review of this page", "does this folder follow the design
system"), this front runs standalone: no diff,
no other fronts, no curation question. The scope is whatever the user pointed at.

1. **Resolve the design source first.** Standalone changes nothing about §1: no source,
   no review, and say so with what would create one (a token file the build reads, or
   a visual direction in `design/<surface>.md`).
2. **Establish the scope.** A folder or file set → enumerate the UI files under it
   (Glob) and read them. A URL or a dev server → open it with the preview/browser tools
   and read the rendered page. Both → both; the rendered page is the authority where
   they disagree.
3. **Walk the four criteria** across that scope, not just changed lines. Fan out one
   agent per criterion (tokens, components, states, consistency) when the surface is
   more than a handful of files; the barrier and the verify pass in `verify.md` still
   apply, with the enumerated file set as `scope_files` and **no report cap**.
4. **With the page rendered, settle what source can't**: the computed value where the
   cascade decides (which color actually painted, which spacing actually resolved),
   states reached by actually hovering and focusing, and consistency across breakpoints.
   Token values still come from the source or the computed styles, never measured off a
   screenshot. Then run the critic pass on the screenshots, the critic findings joining
   the report with their severity.
5. **Report grouped by priority**, High first, each finding with where, the criterion,
   the source cited, and a concrete fix. Close with the per-priority count and the one
   line of design-system gaps found along the way.
6. **Gate** (per the plugin-root `references/handoff-gate.md`): "Fix the High and
   Medium ones (Recommended)" → `act-apply-fixes.md`, then "Stop here".
