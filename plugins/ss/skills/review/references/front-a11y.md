# Front: a11y, WCAG AA over the UI

One finder over the markup and styles the branch changed, static, no browser: what a
code review can prove from the diff alone.

A whole screen, a page or a folder with no diff is `/ss:ui-critique`'s, whose accessibility
pass (`<plugin-root>/skills/ui-critique/references/a11y-pass.md`) applies the criteria and
the priority matrix below to the rendered target, so findings read the same either way.

## What's checkable from source

- **Semantics**: a `div`/`span` carrying a click handler, role, or tab index
  where a `button`/`a`/`input` belongs; heading levels skipped; landmarks missing
  on a new page or region; a list built from non-list elements.
- **Names**: an image, icon button, or icon-only link with no accessible name
  (`alt`, `aria-label`, `aria-labelledby`, visually-hidden text); an `alt` that
  repeats the surrounding text or describes the file; a new `<title>`-less SVG
  used as content.
- **Forms**: an input with no associated `<label>` (`for`/`id` or wrapping); a
  placeholder used as the only label; a required field marked only by color or an
  asterisk; a validation error not wired to its field via `aria-describedby`;
  `aria-invalid` missing on a field the diff can put in an error state.
- **Keyboard**: an interaction reachable only by mouse (`onClick` without a key
  handler on a non-native control); `tabindex` greater than 0; a focus trap in a
  new modal/drawer/menu, or one with no escape path (`Escape`, focus return to
  the trigger); focus moved without a reason the user can perceive.
- **Focus visibility**: an `outline: none` / `focus:outline-none` with no
  replacement focus style on the same element.
- **Live regions and state**: new async content (toast, loading state, result
  count, error banner) with no `aria-live`/`role="status"`; a toggle whose state
  lives only in a class name instead of `aria-expanded`/`aria-pressed`/
  `aria-selected`.
- **Contrast**: only when both colors are literal in the source or resolvable
  through the design tokens it uses. Compute the ratio and name it (4.5:1 for
  text, 3:1 for UI elements and large text). A color that resolves only at
  runtime is reported as out of static reach; `/ss:ui-critique` settles it on the
  rendered page.
- **Motion and media**: a new animation with no `prefers-reduced-motion`
  branch; autoplay without a control; video/audio added with no captions or
  transcript path.

## Finding shape

```
# | file:line | WCAG criterion (name plus number) | what fails | who it blocks | priority | fix
```

`who it blocks` is this front's `failure_scenario`, the user-visible
consequence, stated as the person and the block: "someone navigating by keyboard
cannot reach the confirm button", "the screen reader announces 'button' without saying what for".
A finding that can't name who loses access isn't one.

Exactly one priority per finding: **Critical** (blocks access entirely),
**Major** (significantly degrades it), **Minor** (inconvenient but workable),
**Enhancement** (better, not required). Cap 8.

Those four are WCAG's priorities, so they stay this front's vocabulary and this
front's alone. At the **report boundary**, where the front's findings enter the
unified report, each one also carries the level the rest of ss reads, per the
plugin-root `references/finding-levels.md`: Critical and Major are **Bloqueante**,
Minor and Enhancement are **Sugestão**. The priority stays in the finding row above;
the level is what `verify.md` ranks by and what the report and the PR comments show.

## Scope discipline

- Only elements the diff added or changed. Pre-existing a11y debt in a file the
  branch happens to touch is not this branch's finding. If it's severe, it goes
  in one line at the end as "existing debt, outside the diff", not as an item to
  fix here.
- A component that inherits its semantics from a design-system primitive is
  judged by what the diff passes it, not by the primitive's internals. Missing
  props (`aria-label` on an icon-only `Button`) are in scope; the primitive's own
  markup is not.
- When the repo's design system documents an accessibility contract, a violation of it is a `rules` finding with the doc cited, not an
  a11y guess.
