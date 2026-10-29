# Spec state: the `.ss/<slug>/` contract

The single on-disk contract for a slug's durable state. **`spec.md` has exactly one
writer**: `/ss:shape` writes it, and `/ss:build` and `/ss:ship` read it. Any skill that
reads or writes this state follows this file. The contract lives here and nowhere else.

## Location

`.ss/<slug>/` is the slug's folder; `<slug>` is a short kebab name matching the dir,
and everything durable about that work lives inside it:

```
.ss/<slug>/
└── spec.md        # the contract, /ss:shape, single writer
```

- The `.ss/` root is the nearest ancestor of the cwd that already has one, searching
  no further up than the repository, the directory holding `.git`; if none inside it
  does, the root is created in the cwd. **Resolve it that way every time**. A bare
  relative `.ss/` mints a second root whenever a skill runs from a subfolder, and the
  slug's spec ends up in a different tree. The repository is where the walk stops
  because past it the next `.ss/` up belongs to another project, or to the home
  directory, and a run standing in a repo of its own would adopt someone else's specs.
  `scripts/scan_specs.py` resolves it, and `find_ss_root` is that rule in code.
- **`wiki` is a reserved slug.** `.ss/wiki/` is the project's knowledge base, not a
  spec folder; its contract is `references/wiki-state.md`.
- **The folder may be a symlink into a canonical store** (the pattern used when a
  project's specs live outside the repo). Read through it and write to the canonical
  target. The Edit tool refuses to write through a symlink on purpose, and that refusal
  is what stops a copy being born in the repo. The in-repo path stays in place as the
  symlink, because every reader and every resumption glob names `.ss/<slug>/…`.

## Frontmatter

**The spec carries its own frontmatter, and there is no state file beside it.** What a
later session needs to know is written at the top of the document, so there is nothing
to keep in sync and nothing outside `.ss/<slug>/` to read first.

**`spec.md`** opens with:

```yaml
---
status: pending # pending | in-progress | done | blocked
created: 2026-07-23 # YYYY-MM-DD, set when the spec is first written
slug: <kebab-slug> # matches the dir name
---
```

- `pending`: no task done yet.
- `in-progress`: some tasks done, not landed (resumable).
- `done`: the build→ship chain completed its landing.
- `blocked`: build's safety valve or ship hit an unrecoverable stop; needs a human.

**The spec review reports at the gate, not in the block.** Its verdict is about the
session that ran it, so it reaches the user in the line `/ss:shape` renders there
and stops being state; a value on disk would outlive the run that earned it, and every
later session would read it as a fact about the document.

**`/ss:build` owns the `status` lifecycle**: it flips the value as it selects, runs
and lands a spec, and the `## Tasks` checkboxes inside the spec are the same skill's.
`/ss:shape` only writes the initial block (`status: pending`) on finalize. A spec without
the block is treated as `pending` with unknown `created` (sorted last in bare selection).

**Selection is a script, not a scan the reader repeats.**
`<plugin-root>/scripts/scan_specs.py` resolves the `.ss/` root the way this file
says to, parses every block, applies the rule above and prints the whole set plus the
`selected` one; `preflight.py` imports its `scan()` so a review's probe reads the same
answer. What stays prose here is the contract; what a caller runs is the script.

**Sections replace, they do not accumulate.** `.ss/` is tracked in git, so the history
of rounds is `git log`, and the spec carries the current state. Its format is
`<plugin-root>/skills/shape/references/spec-format.md`.
