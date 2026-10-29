---
status: in-progress
created: 2026-10-29
slug: research-skill
---

# The research skill

`/ss:research` researches a topic and writes a verified report. It replaces
`/ss:code-deep-research`, which only read code, and joins two things: the source-backed
research of the native deep-research skill (many sources, one synthesized report) and the
code research ss already had (find, clone and read real repositories, and check every
finding against the source).

Why now: ss is meant to run mostly under `/ss:orchestrate`, where side sessions run shape,
build, review and ship and the person never watches them. Research has to work when an
agent calls it, with nobody there to answer a question, and its result has to outlive the
session that ran it. `/ss:shape` is its main caller: a draft built on facts the repo does
not hold is a draft built on guesses.

Success: a side session running `/ss:shape` on an idea that depends on outside facts runs
the research on its own, gets `.ss/<slug>/research.md`, and writes a draft that cites it.

## The three fronts

The research picks which fronts the topic needs, and they combine:

- **Code**: when reading real code settles the question. Find repositories (the bundled
  `search_repos.py`, carried over from `code-deep-research`), or resolve a named project,
  then clone and read them. Evidence is `file:line` in a cloned repo.
- **Content**: the web, official docs, articles, discussions. Evidence is a URL plus the
  passage that supports the claim.
- **Visual**: design references, screens and flows, found on the open web: public design
  galleries and the real products' own sites. A bundled stdlib script downloads a page's
  `og:image` and its images to a temporary folder, and the agent opens them with `Read`,
  so it sees the reference without a browser. A page that only renders in JavaScript
  yields little that way; a browser screenshot covers it when a browser tool is
  connected. Evidence is the page URL and the image it shows.

A topic like "how do apps do onboarding with a paywall" takes the visual and content
fronts; "how does vscode build its WSL server" takes code and content.

## The report

`.ss/<slug>/research.md` is the research's own file, beside the spec in the same slug
folder. It carries the question, the fronts used, the verified findings with their
evidence, a comparison when there is more than one option, a recommendation, and a closing
section of what stayed open: claims that only partly held, fronts that were unavailable,
and what the cap left out. The research returns a short summary plus the path.

## Decisions

- The report always lands in `.ss/<slug>/research.md`, whoever calls. Called by shape, it
  takes the spec's slug. Called alone, it derives a slug from the topic, so a later shape
  on the same idea finds it.
- A rerun on the same slug rewrites `research.md` whole. The previous version lives in git.
- The research never commits. Shape commits `research.md` with the spec; a standalone
  caller decides what to do with the file.
- The research never stops to ask. It runs to the end within a fixed cap (at most three
  repositories cloned, a bounded number of verify rounds) and writes what the cap left out
  into the report's open section.
- It ends with no handoff gate: it reports the summary and the path, and stops. Called by
  shape, shape continues into the draft.
- Every load-bearing claim passes an independent verifier that tries to refute it against
  its evidence: the code it cites, the page it quotes, the screen it links. A refuted claim
  leaves the report or sends the research back for another round; an unverified claim is
  an open question, never a finding.
- The visual front works from the open web with no account and no MCP: web search, then
  the image script, then a browser screenshot only for pages the script cannot read.
- A front with no tool to run it (no web search, no `gh`) is skipped and named in the open
  section; the research continues on the fronts it has.
- The research runs its own pipeline and depends on no outside skill. The native
  deep-research skill is a model for the content front, not a dependency.
- Shape decides on its own to run the research before the draft, when the draft depends
  on facts the repo does not hold: how others build something, a library nobody here has
  used, a UI pattern. It says so in one line and asks nothing. An existing
  `.ss/<slug>/research.md` is read instead of rerun.
- The trigger phrases of `code-deep-research` carry over to `research`, plus phrases for
  content and visual research, in English and Portuguese.

## Behavior

Happy path, called by shape:

1. Shape reads the idea and the wiki, sees the draft needs outside facts, and says in one
   line that it runs the research first.
2. The research turns the topic into the 2–5 questions the report must settle and picks
   the fronts.
3. It fans out per front, gathers findings with evidence, then runs the verifiers.
4. Refuted load-bearing claims send it back for a round, within the cap.
5. It writes `.ss/<slug>/research.md` and returns the summary and the path.
6. Shape writes the draft on top of the report, citing it, and commits the report with
   the spec on finalize.

| case                                                     | outcome                                                    |
| -------------------------------------------------------- | ---------------------------------------------------------- |
| WHEN called alone with no slug                           | THEN it derives a kebab slug from the topic                |
| WHEN the derived slug is `wiki`                          | THEN it picks another slug                                 |
| WHEN `.ss/<slug>/research.md` exists and research reruns | THEN the file is rewritten whole                           |
| WHEN shape finds an existing `research.md` for the slug  | THEN shape reads it and does not rerun the research        |
| WHEN the idea needs no outside facts                     | THEN shape skips the research and drafts as before         |
| WHEN a reference page renders only in JavaScript         | THEN a browser screenshot, else it is listed as unseen     |
| WHEN a page has no image the script can pull             | THEN the reference is a link only, marked unverified       |
| WHEN no tool exists for any front the topic needs        | THEN the report says so and the open section lists it      |
| WHEN discovery finds more than three good repositories   | THEN it clones three and lists the rest as left out        |
| WHEN every load-bearing claim is refuted after the cap   | THEN the report says nothing was verified, with what tried |
| WHEN there is no Agent tool in the session               | THEN the fronts and verifiers run inline, one at a time    |
| WHEN a person calls `/ss:code-deep-research`             | THEN the skill no longer exists; `/ss:research` triggers   |
| WHEN a standalone run ends                               | THEN `research.md` stays uncommitted and the path is shown |

## Attention points

- `scan_specs.py` globs `.ss/*/spec.md`, so a slug folder holding only `research.md` must
  stay invisible to it and to every reader that lists slugs.
- `plugins/ss/references/spec-state.md` draws `.ss/<slug>/` with `spec.md` alone and says
  `spec.md` has one writer; `research.md` is a second file with a different writer.
- Clones landing inside the repo would end up in a commit; the clone directory sits
  outside the worktree, and Windows has no `/tmp`.
- Downloaded images and pages are untrusted data: the image script writes into its own
  empty folder outside the repo, and a page can serve huge files or non-image content
  under an image name.
- `plugin.json` carries the skill list in its `description` and a `version`; four other
  PRs open in parallel touch the same plugin and can conflict on both.
- `shape/references/spec-format.md` is being edited on another branch and stays untouched
  here.

## Tasks

### Foundation

- [ ] **1. The research skill**: `plugins/ss/skills/research/` exists with `SKILL.md`
      (three fronts, cap, verifiers, report at `.ss/<slug>/research.md`, no gate),
      `scripts/search_repos.py` and the image script; `plugins/ss/skills/code-deep-research/`
      is gone. · verify: CI

### Callers and references

- [ ] **2. Shape runs the research**: `plugins/ss/skills/shape/SKILL.md` runs the research
      before the draft when the idea needs outside facts and commits `research.md` with the
      spec; `plugins/ss/references/spec-state.md` lists `research.md` in the slug folder.
      · verify: reading
- [ ] **3. The old name goes away**: `README.md` rows, `.claude/CLAUDE.md`, `plugin.json`,
      `plugins/ss/references/handoff-gate.md` and any other trigger name `research`.
      · verify: CI

## Out of scope

- The README rewrite around orchestrate, which comes after the open PRs land.
- `shape/references/spec-format.md`.
- Build or review reading `research.md`. _revisit_

## Open

Nothing.
