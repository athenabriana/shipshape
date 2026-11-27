# A round and its fixes

Steps 3 and 4 of `/ss:ui-critique` read this page: what every round does, and how critique
and fix lands the fixes before the next round.

## A round

Every round is the same, from round 1 to the last:

1. **Screenshots.** Render the target and capture every task the goals name, each step and
   the states it passes by (empty, loading, error, disabled, hover, focus, overflow), at a
   desktop width and at 390 px, by `design-loop.md` "Real visuals, always", into the loop
   folder's `shots/r<N>/`. A canvas is rendered by `references/canvas-target.md`. After
   round 1 the round is scoped: capture again what the last fixes touched, plus anything a
   finding asked for, and a contact sheet of the rest; a full pass captures everything, by
   `design-loop.md` "Scoped rounds and the full pass". With the browser in hand, run the rendered accessibility checks here too
   (`references/a11y-pass.md` §3): the `Tab` walk, the accessibility tree, the live
   regions.
2. **The critic and the auditor, in one message.** One `Agent` call with
   `subagent_type: "ss:ss-design-critic"`, fresh and memoryless, with the prompt
   `design-loop.md` "Dispatch the critic" lists, the UI references included; beside it, one
   with `subagent_type: "ss:ss-a11y-auditor"`, fresh and memoryless, given the screenshots,
   the source, the tokens, the rendered checks of step 1, the round's open accessibility
   findings, the target kind and the paths of `references/a11y-pass.md` and
   `<plugin-root>/skills/review/references/front-a11y.md`. When a design source resolved
   and the target is code, the design system pass (`references/design-system-pass.md`)
   runs beside them. Record each agent's id in `state.json` as it is dispatched.
3. **Pool the findings.** One numbered list across the three: each item with its source
   (critic, accessibility, design system), its severity in its own words (High, Medium,
   Low for the critic and the design system; Critical, Major, Minor, Enhancement for
   accessibility) and its screenshot or `file:line`.
4. **Decide the round.** It is **pleased** only when the critic returned
   `pleased: true` and `goals_achieved: true` and no accessibility or design system
   finding is open. Accessibility findings block like the critic's: a page the critic
   loves and a keyboard cannot reach is not done. A check the auditor lists as "not
   reachable on a canvas" blocks nothing: it is carried to the build. A scoped round that
   comes back pleased is not the end: the next round is the full pass, and only a pleased
   full pass ends the loop.
5. **Show the convergence**, by `design-loop.md` "Convergence": the open findings by
   severity and the trend so far, as the round's line in the task list.

In critique only, round 1 ends here: go to the report.

## Fix, then the next round

In critique and fix, by `design-loop.md` "Fix, then repeat":

- **On a canvas target**, the fixes are edited in the loop folder's copy of the
  artboards, every fill board's height measured again, and the canvas republished to its
  own URL, by `references/canvas-target.md`.
- **On the mockup path** of a code target, the fixes land on the canvas first, through the loop
  `show-for-review.md` describes (the faithful rebuild, the design, the person's approval),
  and the code is written from the approved canvas.
- **Fix in batches**, by `design-loop.md` "Fix, then repeat": group the findings that share
  a cause (a token, a component, a pattern across screens), fix each group in one change,
  and list the groups with the findings each closes in the round's line.
- **On the real screen**, fix every open finding, every severity, group by group.
  An accessibility fix is the concrete fix its row names. A finding is refused only with
  a ground the next round can check: it contradicts the person's request, the goals or
  the design source, quoted. A refused finding rides into the next round with its ground.
- **End each round at a clean step**: commit the code that changed, in the repo's
  conventional style, or republish the canvas; then write `state.json`. A stop at any
  point is then a clean step. Pushing and a PR are `/ss:ship`'s, offered at the gate.

Then the next round, with the open findings and the refusals in the critic's prompt. The
loop stops only as `design-loop.md` "When the loop stops" says: both verdicts true with no
accessibility or design system finding open, the person's cap, or the usage window running
low (read with `mcp__ccd_session_mgmt__get_usage` after each round, by `long-run.md`).
