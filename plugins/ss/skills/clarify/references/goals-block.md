# Write the goals: where the approved block lands

Clarify reads this at step 8, before it writes the approved goals.

The approved goals land as one block, written where the caller said:

- **A path the caller gave** (a brief file, a front doc, a PR description): write the block
  there. A block from an earlier round in the same place is replaced whole.
- **No path, and the work is big**: the goals doc, by "What the doc holds" in `goals-doc.md` (or `goals.md`,
  by "No Docs tools").
- **No path otherwise**: write the block into chat, as the last thing before the gate or
  the hand-off.

Clarify creates no other file (beyond `goals.md`, by "No Docs tools" in `goals-doc.md`) and commits nothing.

```markdown
## Goals

- G1 WHEN <case> THEN <observable outcome> · check: <test, command, screenshot or source>
- G2 WHEN <case> THEN <observable outcome> · check: <test, command, screenshot or source>

## Out of scope

- <a hard line, or an idea parked for later>

## Decisions

- <a business rule or a call closed with the person, in the words of the product>

## Work, in order

1. <foundation step>
2. <step> · <step> (side by side)
3. <closing step>

## Attention points

- <a technical risk, and where it lives in the code>
```

`## Goals` is always there. The other sections appear only when they carry something.

**The block describes what to build, not how you got there.** Say each thing once, and name
things the way the repo names them, because the goals' words become the words of the build.

**Attention points name the risk, not the fix.** One bullet each: the technical risk and
where it lives. The solution is the builder's, decided with the code open.
