# The accessibility pass: WCAG AA over the target

Every round of `/ss:ui-critique` runs this pass beside the critic. Its findings block the
round's "pleased" like the critic's. The criteria, the finding shape and the four
priorities are `<plugin-root>/skills/review/references/front-a11y.md`, the same ones
`/ss:review`'s a11y front applies to a diff: read its "What's checkable from source" and
"Finding shape" before finding anything. This page is the scope that front leaves out, a
whole target with no diff.

There may be no git repository and no branch: the scope is whatever the request pointed
at.

## Who runs it

The `ss-a11y-auditor` agent (`<plugin-root>/agents/ss-a11y-auditor.md`), dispatched as
`subagent_type: "ss:ss-a11y-auditor"` beside the critic in every round, fresh and
memoryless. It reads and computes; it holds no browser. So the rendered checks of §3 run
first, in the main context that holds the browser, and their screenshots and tree readings
go into the auditor's prompt. When the target is more than a handful of files, the auditor
is one per criterion group of §2, all in one message.

## 1. Establish the scope

- **A folder or a file set**: enumerate the UI files under it (`Glob`) and read them.
- **A URL, a dev server or a running app**: open it with the browser or app tools and read
  the rendered page.
- **Both**: do both. The rendered page is the authority where they disagree.
- **Screenshots alone**: only what a picture shows is checkable (contrast, text size,
  target size, a missing visible label, focus that is or is not drawn). Say in one line
  what the pass could not reach.
- **A Design canvas**: the rendered artboards and their `.dc.html` source, by
  `canvas-target.md`. The live keyboard walk and the accessibility tree are reported as
  "not reachable on a canvas", never as a pass, and carried to the build.

## 2. Walk every criterion across the scope

Every criterion of `front-a11y.md`, across the whole scope, not only what a fix touched.
When the scope is more than a handful of files, fan out one `ss:ss-a11y-auditor` per
criterion group (semantics and names, forms, keyboard and focus, live regions and state,
contrast and motion), each with the file list and the criteria of its group, all in one
message. There is no cap: every failure found is reported, since a cap would hide what the
pass is for.

After round 1, walk again what the last fixes touched and every finding still open.

## 3. With the page rendered, settle what source cannot

- **Contrast** computed from the colors that actually painted, or from the tokens when the
  target is a canvas, with the ratio named (4.5:1 for text, 3:1 for large text and UI
  elements).
- **Tab order and focus visibility**, by pressing `Tab` through the page and taking a
  screenshot of each stop that matters.
- **What a screen reader announces**, from the accessibility tree (`read_page` in Claude
  in Chrome, or the platform's own).
- **Live regions** firing on a state change: trigger the change, read the tree again.
- **Reflow** at 320 px and at 200% zoom.

A finding settled on the rendered page cites its screenshot or the tree's line; one from
source cites `file:line`.

## 4. What goes into the round

Each finding in `front-a11y.md`'s finding shape: where, the WCAG criterion (name and
number), what fails, who it blocks, the priority, and a concrete fix. A finding that cannot
name who loses access is not one. Close the pass with `WCAG AA: pass | fail | partial` and
the count per priority.

Every priority blocks "pleased", Enhancement included, the same way the critic's Low
findings do: the loop ends when nothing is left to send back. A finding the round refuses
carries a ground the next round can check, as `design-loop.md` asks of every refusal.
