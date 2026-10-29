# Wiki state: the `.ss/wiki/` contract

The repository's memory of what the code cannot say: the reason behind a decision, a
business rule, an external constraint, a trap and the way around it. ss writes it and ss
reads it, with no curation step. **Two skills write it, each in its own lane**:
`/ss:shape` writes `proposed` facts on finalize, and `/ss:build` promotes them and runs the
maintenance after its last phase lands. Every other skill reads. Any skill that reads or
writes the wiki follows this file. The contract lives here and nowhere else.

## Location

`.ss/wiki/` sits under the `.ss/` root `references/spec-state.md` resolves, the same root
every spec lives in, and is tracked in git: it lands through the same branch and PR as the
work that wrote it. `wiki` is a reserved name under `.ss/`, so no spec slug is ever `wiki`.
The folder holds no `spec.md`, which is why `scan_specs.py` never reads it as a spec.

```
.ss/wiki/
├── facts/<slug>.md              # one claim per file (type: fact)
├── entities/<kind>/<slug>.md    # hubs: module | service | tool | concept | external
├── entities/index.md            # derived: the entity catalog
├── index.md                     # derived: the router
└── log.md                       # one line per write pass
```

The layout is an Open Knowledge Format bundle, applied the way elephant-mem applies it:
plain markdown with YAML frontmatter, entities as the navigation spine, atomic facts
hanging off them by link, every aggregate file derived by a script.

## What becomes a fact

**Only what reading the code does not reveal.** The reason behind a decision, a business
rule, an external constraint, a trap and the way around it. How a module works is the
code's to say. Both writers apply this rule before they write, and a write pass that finds
nothing passing it writes nothing and says so in one line.

**One claim per file.** A fact states one thing a reader can hold the code against. Two
claims that can go stale apart are two facts.

## Fact frontmatter

```yaml
---
type: fact
title: "Sessions, not JWT, carry auth"
description: "Revocation has to be immediate, and a JWT stays valid until it expires."
paths: ["src/auth/**", "src/middleware/session.ts"]
sources: ["spec:session-auth", "pr:42", "commit:1a2b3c4"]
status: current # proposed | current | superseded
created: 2026-10-28
updated: 2026-10-28
superseded_by: "/facts/other-slug.md" # only when superseded by a newer fact
---
```

- `paths`: the globs of the code the fact governs, relative to the git root, in git's
  pathspec sense: `*` stays inside one directory, `**` crosses them. A fact with no code to
  govern yet (a decision for files the spec will create) names the paths the spec says
  they will have.
- `sources`: where the fact came from, each prefixed `spec:`, `pr:` or `commit:`.
- Every free-text scalar (`title`, `description`) is double-quoted, with an inner `"`
  escaped as `\"`. An unquoted `: ` breaks the block and an unquoted ` #` truncates the
  value, both silently, so `validate_wiki.py` checks it.

The body states the claim in a few sentences and links each entity it concerns with a
bundle-absolute markdown link, `[importer](/entities/module/importer.md)`. Links are
markdown, never `[[wikilinks]]`. A fact that replaced another names it in the body.

## Entity frontmatter

```yaml
---
type: entity
kind: module # module | service | tool | concept | external
title: "Importer"
description: "Reads partner CSV drops into the ledger."
---
```

The hub's body is a short description of the entity. Below it, between the markers
`<!-- backlinks:start -->` and `<!-- backlinks:end -->`, `build_wiki.py` writes the list
of facts that link to it, `current` first. That block is derived: never edit it by hand.

## The status lifecycle

| status       | written by                  | meaning                                        |
| ------------ | --------------------------- | ---------------------------------------------- |
| `proposed`   | `/ss:shape`, on finalize    | a decision of a spec that has not landed yet   |
| `current`    | `/ss:build`, in its pass    | knowledge that governs the code today          |
| `superseded` | `/ss:build`, in its pass    | replaced by a newer fact, or left with no code |

- **A `proposed` fact never supersedes anything**, and no reader treats it as a rule: a
  spec that is never built changes nothing that governs the code.
- **The newer fact always wins.** A `current` fact contradicted by a fact the build
  promotes or writes becomes `superseded`, with `superseded_by` naming the new one. The PR
  diff is where a person sees it.
- `superseded` is final. A fact that becomes true again is a new fact.

## The two lanes

**`/ss:shape`, on finalize.** For each bullet of the spec's `## Decisions` that passes the
rule, write a `proposed` fact with `spec:<slug>` in `sources`, and create the entities it
links when they do not exist. A spec finalized again rewrites its own `proposed` facts in
place (they are matched by the `spec:<slug>` source), never duplicates them. Then run
`build_wiki.py` and `validate_wiki.py`, and commit with the spec.

**`/ss:build`, once, after the last phase lands and before the review.** The pass, in
order:

1. **Promote**: every `proposed` fact sourced to this spec becomes `current`.
2. **Record**: the choices the task agents recorded (a technical choice the spec left
   open, a trap, a constraint met in the code) become `current` facts, under the rule, with
   this spec and the task commits in `sources`.
3. **Dedup**: a fact the pass would write that already exists is merged into the existing
   one: the source is appended and `updated` bumped.
4. **Supersede**: a `current` fact the promoted or recorded ones contradict becomes
   `superseded`.
5. **Follow paths**: `validate_wiki.py` lists the facts whose `paths` match no file. A
   rename git reports (`git log --follow --name-status`) rewrites the glob; a file gone for
   good marks the fact `superseded` with no successor.
6. **Rebuild and validate**: `build_wiki.py`, then `validate_wiki.py`, which must exit 0.
   An error is fixed before the commit; one still red stops the run like a red check.
7. **Commit** as `docs(wiki): <what the pass recorded>`, on the run branch.

A build that stops before its last phase lands runs no pass: its `proposed` facts stay
`proposed`.

## The seed

The first write in a repo with no `.ss/wiki/` creates the bundle and seeds it, once: the
`## Decisions` of every spec already `done` under `.ss/` pass through the rule and become
`current` facts, sourced to their specs. A repo with no `done` spec starts with only what
the write adds. The seed runs inside the writer's own pass, and a long one is said in one
line, with how many specs it read.

## Derived files

Written only by `<plugin-root>/scripts/build_wiki.py`, never by hand:

- `index.md`: the router. Counts by status, the entity kinds with links into the catalog,
  and the most recently updated facts. No frontmatter.
- `entities/index.md`: the catalog, every entity by kind with its description. No
  frontmatter.
- the backlinks block on every entity hub.

`log.md` is appended, never rewritten: one line per write pass, `YYYY-MM-DD <skill>
<slug>: <what changed>`. No frontmatter.

## Reading the wiki

Consultation is by path, with no search. `preflight.py`'s `wiki` field carries the
`current` facts whose `paths` match a file in the diff. `build_wiki.py match --files ...`
answers the same question for any list of files, which is how a reader with no diff yet
asks it.

- `/ss:shape` reads `entities/index.md` and the facts covering the area the idea touches
  before it drafts, and the draft opens from them.
- Each `/ss:build` task agent receives the `current` facts covering the files its task
  names, plus the catalog to find the rest.
- `/ss:review`'s `contract` front holds the diff against the matched facts.

A `superseded` fact is history, read only to say what changed. A `proposed` one is read
only by the spec it belongs to.

## Validation

`<plugin-root>/scripts/validate_wiki.py` prints JSON `{errors, warnings, orphans}` and
exits non-zero on any error:

- every non-reserved `.md` has frontmatter with `type` `fact` or `entity`;
- a fact carries every key above, a known `status`, `paths` and `sources` non-empty, and
  `superseded_by` only when `superseded`, resolving to a real fact;
- an entity carries a known `kind`;
- the reserved files (`index.md`, `entities/index.md`, `log.md`) carry no frontmatter;
- every bundle-absolute link resolves to a real file, and no `[[wikilink]]` appears;
- every free-text scalar is double-quoted.

A fact whose `paths` match no file is a warning, listed in `orphans`, never an error: the
build's pass resolves it.
