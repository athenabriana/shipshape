---
status: in-progress
created: 2026-10-28
slug: project-wiki
---

# The project wiki: `.ss/wiki/`

A spec says what one piece of work builds, and once it lands its knowledge stays in that
spec. Why auth runs on sessions, which external limit shaped the importer, the trap a
task agent hit and worked around: a later spec in the same area never sees any of it,
because nothing points from the code back to the spec that explains it.

`.ss/wiki/` is the repository's memory of what the code cannot say. ss writes it and ss
reads it, with no curation step: `/ss:shape` records the decisions a spec makes,
`/ss:build` confirms them once they land and keeps the bundle tidy, and every run that
touches a file gets the facts that cover that file, found by path, with no search.

Success looks like this: a spec shaped months later over the same files opens with the
decisions that already govern them, the build's task agents read those decisions before
writing code, and the review flags a diff that quietly reverses one.

## The bundle

The layout follows the Open Knowledge Format the way elephant-mem applies it: plain
markdown with YAML frontmatter, entities as the navigation spine, atomic facts hanging off
them by link, and every aggregate file derived by a script.

```
.ss/wiki/
├── facts/<slug>.md              # one claim per file (type: fact)
├── entities/<kind>/<slug>.md    # hubs: module | service | tool | concept | external
├── entities/index.md            # derived: the entity catalog
├── index.md                     # derived: the router (no frontmatter)
└── log.md                       # one line per write pass (no frontmatter)
```

A fact carries `type: fact`, `title`, `description`, `paths` (the globs of the code it
governs), `sources` (spec slugs, PRs, commits), `status`, `created`, `updated`, and
`superseded_by` when it was replaced. Its body states the claim and links each entity it
concerns with a bundle-absolute markdown link (`/entities/module/importer.md`). The derived
backlinks block on each entity hub lists the facts that link to it.

A fact's `status` is one of three values:

- `proposed`: written by `/ss:shape` for a spec that has not landed yet.
- `current`: the knowledge that governs the code today.
- `superseded`: replaced by a newer fact, or left with no code to govern.

## What becomes a fact

Only what reading the code does not reveal: the reason behind a decision, a business rule,
an external constraint, a trap and the way around it. How a module works is the code's to
say, so it never becomes a fact. A fact that merely restates what the code does is the
noise this rule exists to keep out, and both writers apply it before they write.

## Decisions

- The wiki lives at `.ss/wiki/` under the `.ss/` root `spec-state.md` resolves, is tracked
  in git and lands through the same branch and PR as the work that wrote it.
- `wiki` is a reserved name under `.ss/`: `/ss:shape` never mints a spec slug `wiki`.
- A fact records only what the code does not reveal (the section above). One claim per
  file.
- There is no curation step and no wiki skill. `/ss:shape` and `/ss:build` are the two
  writers, each with its own lane:
  - `/ss:shape`, on finalize, writes the spec's decisions that pass the rule as
    `proposed` facts, with the spec's slug in `sources`, and creates the entities they
    link.
  - `/ss:build`, in one pass after the last phase lands and before the review, promotes the
    spec's `proposed` facts to `current`, writes the facts its task agents recorded (a
    technical choice the spec left open, a trap, a constraint met in the code), and runs
    the maintenance.
- The maintenance is automatic: dedup a fact the pass would write twice into the existing
  one, supersede, follow renamed paths, rebuild the derived files, validate. It commits
  as its own `docs(wiki)` commit on the run branch.
- A `current` fact contradicted by a fact the build promotes or writes becomes
  `superseded`, with `superseded_by` pointing at the new one; the new one names the old in
  its body. The newer fact always wins, and the PR diff is where a person sees it.
- A `proposed` fact never supersedes anything: only the build's pass does, so a spec that
  is never built changes nothing that governs the code.
- A fact whose `paths` match no file is resolved by the maintenance: a rename git reports
  rewrites the globs; a file gone for good marks the fact `superseded` with no successor.
  The validator only warns about it.
- The first write in a repo with no `.ss/wiki/` creates the bundle and seeds it from the
  `## Decisions` of every `done` spec already under `.ss/`, under the same rule, as
  `current` facts. That seed runs once.
- Derived files (`index.md`, `entities/index.md`, the backlinks blocks) are written only by
  `<plugin-root>/scripts/build_wiki.py`. `<plugin-root>/scripts/validate_wiki.py` checks
  the bundle and must pass before the `docs(wiki)` commit. Both are stdlib only.
- Consultation is by path. `preflight.py` gains a `wiki` field: the `current` facts whose
  `paths` match a file in the diff. The readers:
  - `/ss:shape` reads `entities/index.md` and the facts covering the area the idea
    touches, and the draft opens from them.
  - Each `/ss:build` task agent receives the `current` facts covering the files its task
    touches.
  - `/ss:review`'s `contract` front checks the diff against the matched facts: a diff that
    reverses a `current` fact without superseding it is a finding.
- `plugins/ss/references/wiki-state.md` is the contract, the way `spec-state.md` is the
  spec's: layout, frontmatter, the status lifecycle, the two lanes and the rule.

## Behavior

Happy path:

1. `/ss:shape` starts on an idea that touches `src/auth/`. It reads the catalog and the
   facts whose paths cover `src/auth/`, and the draft opens from them.
2. The spec converges. On finalize, shape writes the decisions the code will not reveal as
   `proposed` facts sourced to the spec, links their entities and runs `build_wiki.py`.
3. `/ss:build` runs every phase. Each task agent receives the `current` facts covering the
   files its task touches.
4. After the last phase, build's wiki pass promotes the spec's `proposed` facts, writes the
   facts its task agents recorded, supersedes what they contradict, follows renames,
   rebuilds, validates and commits `docs(wiki)`.
5. `/ss:review` runs; the `contract` front reads `preflight.py`'s `wiki` field and checks
   the diff against those facts.
6. The PR carries the wiki diff with the code.

| WHEN                                                         | THEN                                                         |
| ------------------------------------------------------------ | ------------------------------------------------------------ |
| the first write runs in a repo with no `.ss/wiki/`           | the bundle is created and seeded from the `done` specs, once |
| the repo has no `done` spec at the first write               | the bundle starts with only what this write adds             |
| a spec's decisions all restate what the code does            | shape writes no fact, and says so in one line at the gate    |
| shape finalizes a spec that is never built                   | its facts stay `proposed` and no reader treats them as rules |
| shape re-finalizes a spec after a change at the gate         | that spec's `proposed` facts are rewritten, not duplicated   |
| build promotes a fact that contradicts a `current` one       | the old becomes `superseded`, `superseded_by` the new one    |
| build would write a fact that already exists                 | the existing fact gains the new source and `updated`         |
| build stops before the last phase lands                      | no wiki pass runs; the `proposed` facts stay `proposed`      |
| a fact's path was renamed outside ss                         | the maintenance rewrites the glob to the new path            |
| a fact's file was deleted outside ss                         | the maintenance marks it `superseded` with no successor      |
| `validate_wiki.py` reports an error in the pass              | build fixes it before the commit; still red stops the run    |
| the diff touches no file any `current` fact covers           | `preflight.py`'s `wiki` is empty; readers go on without it   |
| the review sees a diff reversing a `current` fact            | the `contract` front reports it as a finding                 |
| an idea gets the slug `wiki`                                 | shape picks another slug                                     |
| a fact's frontmatter carries an unsafe free-text scalar      | the validator reports it; the pass quotes it and rebuilds    |
| `scan_specs.py` walks `.ss/`                                 | `.ss/wiki/` has no `spec.md` and is not read as a spec       |

## Attention points

- `.ss/` is subtracted from the diff every review front reads (`skills/review/SKILL.md`,
  step 1) and from `preflight.py`'s `probe_ui`, so the wiki diff is invisible to the review
  while the `contract` front needs the wiki itself as its ruler.
- Which files a task touches is known only after its agent runs, while the facts have to
  reach the agent before it writes (`workflows/build-tasks.js`, the prompt each task agent
  receives).
- The tasks of one phase run in separate worktrees; a fact written from inside a task would
  conflict in the derived files when the phase lands (`workflows/build-tasks.js`).
- Frontmatter written by a model breaks silently on an unquoted `: ` or ` #`, which empties
  the backlinks or truncates a value with no error (elephant-mem's `validate-okf.py` names
  the failure).
- Glob matching in Python's `fnmatch` treats `/` like any other character, so `src/*` also
  matches `src/a/b.py`, which differs from git's pathspec semantics (`preflight.py`).
- The seed from old specs runs inside the first writer's own pass, so a repo with many
  `done` specs makes that one shape or build run much longer.

## Tasks

### Foundation

- [x] **1. The contract**: `plugins/ss/references/wiki-state.md` states the layout, the
      fact and entity frontmatter, the status lifecycle, the two writers' lanes, the rule
      of what becomes a fact, the seed, and the maintenance steps. · verify: reading

### Scripts and probe

- [x] **2. `build_wiki.py`**: `<plugin-root>/scripts/build_wiki.py` writes `index.md`,
      `entities/index.md` and every backlinks block from the facts and their links. ·
      verify: reading
- [ ] **3. `validate_wiki.py`**: `<plugin-root>/scripts/validate_wiki.py` checks
      frontmatter, the status values, reserved files, link resolution and YAML-safe
      scalars, warns on orphan paths, and prints JSON. · verify: reading
- [ ] **4. The probe**: `preflight.py` returns `wiki`, the `current` facts whose `paths`
      match the diff's files. · verify: reading

### The writers and the readers

- [ ] **5. Shape writes and reads**: `skills/shape/SKILL.md` reads the catalog and the
      covering facts before the draft, writes `proposed` facts on finalize, reserves the
      slug `wiki`, and seeds the bundle on the first write. · verify: reading
- [ ] **6. Build's wiki pass**: `skills/build/SKILL.md` and its workflow reference feed
      each task agent the covering facts, and run the end pass (promote, record,
      supersede, follow renames, rebuild, validate, commit). · verify: reading
- [ ] **7. The review reads the facts**: `skills/review/references/front-contract.md`
      checks the diff against `preflight.py`'s `wiki`. · verify: reading

### Close

- [ ] **8. The repo catches up**: CI validates a sample bundle with `validate_wiki.py`;
      `README.md`, `.claude/CLAUDE.md`, `spec-state.md` and `plugin.json` name the wiki. ·
      verify: CI

## Out of scope

- A dedicated wiki skill or a manual curation step.
- Embeddings, a vector index or any search beyond path matching. _revisit_
- A rendered viewer of the bundle (OKF's `viz.html`, elephant-wiki). _revisit_
- Facts written by `/ss:ship`, `/ss:review` or any skill other than shape and build.
- Sharing one wiki across repositories.

## Open

Nothing.
