# UI references: real screens before the first design

Before ss designs or judges an interface, it gathers real screens from shipped products
that solve the same pattern, so the design is measured against real work and not against a
default. This page says when to gather them, which source to use first, how to pick them,
where to keep them, and how they are used. The mockup path of
`<plugin-root>/references/show-for-review.md`, the critic's prompt in
`<plugin-root>/references/design-loop.md`, `/ss:ui-critique`, `/ss:shape` and
`/ss:research`'s visual front all follow it.

## When to gather them

- **Before the first mockup**, on the mockup path, for any change that designs something
  new or reworks a screen.
- **Before the first critic round** of `/ss:ui-critique` and of a real-screen change.
- **While shaping**, when the work has a UI, so the draft and its gray areas rest on how
  real products solve the pattern.

Gather them once per pattern and reuse them across rounds. Gather again only when the
pattern changes, for example when the person turns a settings page into a wizard.

## Name the pattern

Name the pattern in two to four plain words, the way a gallery would tag it: "inbox",
"settings", "chat with side panel", "onboarding with paywall", "empty state of a list".
Add the platform (web, iOS, Android) when the work has one. One search per pattern; a
screen with two patterns gets two searches.

## Mobbin first

Mobbin is a library of real app and website screens and flows. Its connector is optional:
the person connects it with their own account. Its tools carry a prefix that differs per
account, so find them by their bare names, never by a full name written down:

1. Search with `ToolSearch` for `search_screens`, `search_flows` and `search_sections`,
   and load the ones that come back.
2. **`search_screens`** for a single screen ("settings page"), **`search_flows`** for a
   sequence of screens a user steps through ("sign up", "checkout"), **`search_sections`**
   for one part of a page ("pricing table", "footer").
3. Read the results and keep the screens that fit, by the next section.

When the search finds none of the three tools, Mobbin is not connected: go to the
fallback.

## The fallback: live sites, then research

1. **Live sites through the browser.** Open the real products that solve the pattern in
   the browser tool at hand (Claude in Chrome, loaded by the `chrome-browser` skill, or the
   built-in browser by its own skill) and take a screenshot of the screen in question.
   Only public pages: never sign in to someone else's product, and never type the
   person's credentials into it.
2. **`/ss:research`'s visual front**, when no browser tool is there or the live sites do
   not show the pattern: public design galleries and the products' own pages, through its
   image script.

Say in one line which source the references came from. When it was not Mobbin, add that
Mobbin was not connected, so the person knows the option exists.

## Pick 3 to 6

Keep three to six references for the pattern, and for each one keep:

- **The product and the screen**, in plain words: "Linear, the inbox with a triage
  panel".
- **Why it fits**, in one line: what it does well for this pattern that the work can learn
  from (the hierarchy, how it handles the empty state, the density).
- **The source link**: the Mobbin link or the page URL, so anyone can open it again.
- **The screenshot**, when there is one.

Prefer references that differ from one another: a dense one and a calm one, a web one and
a mobile one. Fewer than three is fine when the pattern is rare; say so.

## Use them, never copy them

References inform the design. They show what good looks like for the pattern, and they are
never copied: no recreating a specific product's look, its name, its logo, its
illustrations or any of its assets. Take the principle (how the hierarchy reads, how an
empty state guides the user) and build it from the project's own tokens and components.

## Keep them with the work

Store the screenshots and the links next to the work, never in the repo unless the person
asks:

- **On the mockup path**, on the Design canvas: a "References" artboard, or the canvas's
  notes, with each reference's line and link.
- **Otherwise**, in the session's notes folder (or the scratchpad when there is none), in
  a `references/` folder with a `README.md` of the lines above. The notes folder of a work
  session is the one its brief names.

## Give them to the critic

From the first round on, the critic's prompt carries the references (the screenshot paths,
each with its line and link), by `<plugin-root>/references/design-loop.md` "Dispatch the
critic". The `ss-design-critic` agent compares the screens against them and flags what
reads as generic next to them. These references set a bar to meet, not a layout to match:
the `match` criterion stays for the app a mockup rebuilds and the approved mockup a build
follows.

## Report

One line on the source, then the references as a short list: the product and the screen,
why it fits, the link. In a review ask, show them beside the design, by
`<plugin-root>/references/show-for-review.md`.
