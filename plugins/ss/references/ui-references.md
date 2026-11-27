# UI references: real screens before the first design

Before ss designs or judges an interface, it gathers real screens from shipped products
that solve the same pattern, so the design is measured against real work and not against a
default. This page says when to gather them, which source to use first, how to set a
source up when it is missing, how to pick them, where to keep them, and how they are used. The mockup path of
`<plugin-root>/references/show-for-review.md`, the critic's prompt in
`<plugin-root>/references/design-loop.md`, `/ss:ui-critique`, `/ss:scope` and
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

## The sources, in order

Three free sources come first, each an MCP server with no account, no API key and no paid
plan. All three are optional: the person sets them up once, and ss uses the ones that are
there. Their full tool names carry a prefix that differs per setup, so find each by its
bare tool names with `ToolSearch`, never by a full name written down. Inspo and Screenrove
both have a `search_screens` and a `get_screen`: the server name inside the full tool name
tells them apart.

| Source              | What it gives                                                                                                          | Find it by                                               |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Inspo               | real production websites, desktop and mobile captures, with palette, fonts and a design guide per site                 | `recommend`, `get_site_pages`, `get_design_system`       |
| Screenrove          | screens and flows of shipped web products (Linear, Stripe, Notion and about 220 more), with a design guide per product | `get_screen_image`, `find_related_screens`, `list_flows` |
| Chrome DevTools MCP | its own Chrome, to open any public page and screenshot it, at a desktop or a mobile size                               | `new_page`, `emulate`, `take_screenshot`                 |

1. **Inspo.** Call `recommend` with the pattern as the brief, or `search_screens` for a
   single screen; `get_site_pages` walks one site's pages in order, for a flow. Results
   carry thumbnails and links to the full screenshots.
2. **Screenrove.** `search_screens` for the pattern, filtered by its tags (`list_tags` gives
   them, for example `pattern=list-view&state=empty`); `list_flows` and `get_flow` for a
   flow; `get_screen_image` for a screen's screenshot. Its terms allow learning from the
   screens for original work and ask for no bulk download, and it asks agents to name each
   screen's id and capture date in the report.
3. **Chrome DevTools MCP**, for the real products that solve the pattern and that the
   galleries miss: `new_page` on the product's public page, `emulate` for a mobile size
   when the work is mobile, then `take_screenshot`.
4. **The browser at hand**, when Chrome DevTools MCP is not there: Claude in Chrome
   (loaded by the `chrome-browser` skill) or the built-in browser (by its own skill), the
   same way.
5. **`/ss:research`'s visual front**, when no browser tool is there or the live sites do
   not show the pattern: public design galleries and the products' own pages, through its
   image script.

Inspo and Screenrove cover websites and web apps. For native mobile app screens, which no free source
holds, use the product's mobile web at a mobile size, or the store listing and the
product's own pages through `/ss:research`.

Only public pages, through every source: never sign in to someone else's product, and
never type the person's credentials into it.

Say in one line which sources the references came from.

## When a source is missing or fails

A missing source never blocks the work: go on with the next source in the order, and offer
the setup beside it.

1. **Tell the person in one line** which source is missing or failed and why: "Inspo is not
   set up", or the error in plain words ("Chrome DevTools MCP did not start: it needs Node").
2. **Offer to help set it up**, once per session for each source, with the question tool
   (in a work session, through the orchestrator). The person can say no, and the work goes
   on.
3. **On a yes, set it up by the source's kind**, from the table below:
   - **A remote server** (Inspo, Screenrove): give the person the steps in Claude's
     connector settings, which they follow themselves, since ss cannot connect accounts.
     In Claude Code, the `claude mcp add` command does the same, and ss can run it after
     the person says yes to it in that chat. Claude's Free plan allows one custom
     connector, so on it the second remote server goes through that command.
   - **A local server** (Chrome DevTools MCP): show the exact command, and
     run it only after the person says yes to it in that chat.
4. **Check it.** Search with `ToolSearch` for the source's tool names. A server added in
   this session often shows only in the next one: when the tools are not there yet, say to
   restart the session, and go on with the next source meanwhile.
5. **When the setup fails**, explain the error plainly (a missing Node version, a command
   not found, a network error) and go on with the browser path.

None of these sources needs an API key or a token. When a source ever asks for one, the
person sets it as an environment variable or through the connector's own sign-in, never
in a command, a file or the repo.

| Source              | Needs               | Set it up                                                                                                                                                                                                                       |
| ------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Inspo               | nothing             | Claude's settings, Connectors, "Add custom connector": name `Inspo`, URL `https://inspomcp.dev/api/mcp`, no sign-in. Or in Claude Code: `claude mcp add --transport http --scope user inspo https://inspomcp.dev/api/mcp`       |
| Screenrove          | nothing             | Claude's settings, Connectors, "Add custom connector": name `Screenrove`, URL `https://screenrove.com/mcp`, no sign-in. Or in Claude Code: `claude mcp add --transport http --scope user screenrove https://screenrove.com/mcp` |
| Chrome DevTools MCP | Node LTS and Chrome | `claude mcp add --scope user chrome-devtools -- npx -y chrome-devtools-mcp@latest --no-usage-statistics` (the flag turns off the usage statistics it sends Google by default)                                                   |

## Pick 3 to 6

Keep three to six references for the pattern, and for each one keep:

- **The product and the screen**, in plain words: "Linear, the inbox with a triage
  panel".
- **Why it fits**, in one line: what it does well for this pattern that the work can learn
  from (the hierarchy, how it handles the empty state, the density).
- **The source link**: the gallery link (Inspo, Screenrove) or the page URL, so anyone can
  open it again.
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
