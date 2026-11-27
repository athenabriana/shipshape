# The design system pass: the target's code against its design sources

When a design source resolves and the target is code, each round of `/ss:ui-critique` runs
this pass beside the critic. The critic judges the screens on their craft; this pass judges
the code behind them against what the project says a token, a component and a state are.
The method, the citation discipline and the finding shape are
`<plugin-root>/skills/review/references/front-design.md`, the same ones `/ss:review`'s
design front applies to a diff, and its criteria are `design-checklist.md` beside it: read
both before finding anything. This page is the scope that front leaves out, a whole target
with no diff.

## 1. Resolve the design source first

By `front-design.md` §1: the token source the build reads, then the visual direction. No
source means no pass: say so in one line with what would create one (a token file the
build reads, or a visual direction in `design/<surface>.md`), and the critic runs alone.

## 2. Establish the scope

A folder or file set: enumerate the UI files under it (`Glob`) and read them. A running
page: read the code that renders it, found from the page's routes and components. Both:
both, and the rendered page is the authority where they disagree.

## 3. Walk the four criteria

Tokens, components, states and consistency, across the whole scope, not only what a fix
touched. When the scope is more than a handful of files, fan out one read only subagent
per criterion, all in one message. No cap.

With the page rendered, settle what source cannot: the computed value where the cascade
decides (which color painted, which spacing resolved), the states reached by hovering and
focusing, and consistency across the two widths. Token values still come from the source or
the computed styles, never measured off a screenshot.

## 4. What goes into the round

Each finding in `front-design.md`'s finding shape, with the source cited: a finding that
cannot name what it deviates from is dropped, never reported as a guess. Priorities are
High, Medium and Low, and every one blocks "pleased" like the critic's. Close the pass with
the count per priority and one line naming the design system's gaps found along the way (a
raw value no token covers is the system's gap, not a finding).
