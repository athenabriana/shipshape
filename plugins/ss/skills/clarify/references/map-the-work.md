# Map the problem and the code

Clarify reads this at step 1, before it maps the work.

**Map the problem and the code.** Read the request in the person's own words, the
brief, the linked spec or issue, the code the work will touch and its callers, the tests
near it, the repo's `CLAUDE.md` (or `AGENTS.md`) with its `## Project facts`, and the
`CODE_REVIEW_GUIDE.md` when there is one. Note what already holds: a behavior the code
already has is a goal to keep, not one to build. The map is a few lines in the session's
notes: the points the work must answer, each with where it lives (`file:line`, a URL, a
screen).

**Research first when the draft needs outside facts.** When the work depends on facts
the repo does not hold (how others build something, a library nobody here has used, a
UI pattern), run `/ss:research` on the idea first, with no path, so the report comes
back into this session. Decide it alone and say so in one line. The draft cites it, and
its open section feeds the gray areas.

**Pull real UI references when the work has a UI.** Gather three to six real screens
that solve the same pattern, by `<plugin-root>/references/ui-references.md`, and say in
one line which source they came from. The draft cites them where they shape a choice,
and they travel with the goals so the build and the critic get the same set.
