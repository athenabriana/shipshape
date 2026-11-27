# The canvas target: a Design canvas turned into screenshots

A Design canvas is its own path through `/ss:ui-critique`. The fixes land on the canvas
itself: there is no faithful rebuild, no mockup-or-real-screen block and no build step.
This page says how a round gets its screenshots from a canvas, what the clean step is, and
what a canvas cannot show.

## Verifying is the ask

The Design type tells a session not to render or screenshot a canvas unless the person
asked. Running `/ss:ui-critique` on a canvas is that ask: every round renders and
screenshots it, and says so in one line in the opening sheet.

## Turn the canvas into screenshots

The canvas page needs a claude.ai sign-in, so it is not opened in a headless browser.
Each round renders the artboards locally instead:

1. **Read the artboards** with the `Artifact` tool: list the canvas's files
   (`action: "list"`, `scope: "files"`), then read the board list (`canvas.json`) and every
   artboard's `.dc.html` with `action: "read"` and `paths`, into `<loop folder>/canvas/`,
   by `design-loop.md` "The loop folder".
2. **Check what renders.** `render_canvas.py plan` lists the boards in canvas order. The
   script is `<plugin-root>/scripts/render_canvas.py`, run with `python3`; `plan`,
   `measure` and `shoot` take the canvas folder. An artboard that uses
   `{{holes}}`, `<sc-for>` or `<dc-import>` only renders inside the canvas: it comes back
   under `not_static`. Say so in one line, and judge it on the closest real visual there
   is (the person's screenshot of the canvas, or the static boards it composes). It is
   never reported as rendered.
3. **Measure the fill pages.** A board with `expand: "fill"` needs its `h` equal to the
   page height at its `w`. `render_canvas.py measure` returns each fill board's height at
   its width and at 390 px, and lists under `stale` every board whose declared `h` is off.
   A fix that changes a fill page's content sets its `h` from this before the republish.
4. **Screenshot every board** with `render_canvas.py shoot`, into
   `<loop folder>/shots/r<N>/` with `--prefix r<N> --widths 390`: each board at its own width, each
   fill board also at 390 px, at the measured heights. `shots.json` lists the files.

   The Chrome DevTools MCP (`mcp__chrome-devtools__*`), when its tools load, does the same
   by hand: `new_page` on the local file, `resize_page`, `evaluate_script` for the page
   height, `take_screenshot` with `fullPage`. The script is the default because it renders
   every board in one call.

5. **States the boards do not draw** (hover, focus, an open select) are asked of the
   canvas, as a new artboard in the fix pass, when a finding or a goal needs them.

## Big canvases: a contact sheet per round

A canvas with more than a dozen boards sends the critic a contact sheet each round
instead of every full shot. `render_canvas.py sheet`, given the round's `shots.json`,
lays every shot out as labelled tiles, twelve to a sheet.

- **Round 1** gets the sheets and the full shots of every board, so nothing is judged from
  a thumbnail alone.
- **Later rounds** get the sheets, for consistency across the whole canvas, plus the full
  shots of every board the last fixes touched and every board an open finding cites.

The critic may ask for any board in full through `missing`; that board's full shot goes
into the next round. Coverage stays the whole canvas each round; only the resolution of
the untouched boards drops.

## The clean step is the republish

A canvas is not code in a repo, so there is no commit. Each round's fixes are edited in
`<loop folder>/canvas/` and published back to the same canvas URL (the `Artifact` tool,
`url` set to the canvas). The republish is the round's clean step: a stop at any point
leaves the canvas as the last finished round published it. A generator the fix pass
writes (a script that emits the artboards) lives in `<loop folder>/tools/`, never in the
scratchpad.

## What a canvas cannot show

Some checks need a running interface. On a canvas they are reported as **"not reachable
on a canvas"**, never as a pass:

- the live keyboard walk: `Tab` order, focus moving into and out of a dialog, a focus trap;
- the accessibility tree: what a screen reader announces, live regions firing;
- behavior over time: loading, a transition, a reply streaming in.

What a picture and the artboard source do show is checked: contrast from the tokens, text
and target sizes, visible labels and focus styles that are drawn, semantics in the
`.dc.html`, reflow at 390 px. The unreached checks ride to the build as one line in the
report, with the goal or criterion each belongs to.
