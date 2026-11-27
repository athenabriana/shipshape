# Ship Shape

A **Claude Code plugin** (`ss`) published through the `shipshape` marketplace, which also ships `companion`, an optional Telegram assistant that runs as an Agent SDK service. Install via `claude plugin marketplace add athenabriana/shipshape` then `claude plugin install ss@shipshape`. Skills are invoked as `/ss:<skill>` (e.g. `/ss:ship`). `/ss:go` routes a request to a playbook sized to risk; the flow is clarify → build → ship. Long work runs on the goal loop (`plugins/ss/references/goal-loop.md`): goals proposed and approved once, then a fresh judge each round until every goal is achieved and the judge is pleased; `design-loop.md` and `/ss:review`'s loop specialize it. `ss` ships a `SessionStart` operating-context hook, auto-active when the plugin is enabled.

## Structure

```
.claude-plugin/marketplace.json        # lists `ss` and `companion`
.oxfmtrc.json                          # formatter ignores the vendored companion server
plugins/ss/
├── .claude-plugin/plugin.json
├── agents/                            # read-only roles dispatched as ss:ss-<name>
├── hooks/                             # session infra (auto-active, no skill)
│   ├── hooks.json                      # SessionStart context injection
│   ├── inject_context.py               # emits operating-context.md + the <plugin-root> line
│   ├── operating-context.md            # the injected operating frame (edit to tune)
│   ├── enter_worktree.py               # worktree isolation for local autonomous runs
│   └── scheduling-decision.md          # /loop vs Desktop task vs Cloud Routine decision table
├── references/                        # plugin-level docs shared across skills (project-facts, handoff-gate, review-gate, decision-sheet, doc-style, voice, long-run, goal-loop, design-loop, ui-references, triggers, ...)
├── scripts/                           # plugin-level scripts shared across skills (preflight, check_project_facts, ...)
└── skills/
    ├── go                                 # the /ss:go router; playbooks/ holds one recipe per playbook, each running a skill
    ├── clarify, bug-fix, ship, babysit
    ├── investigate, research              # this repo and your sessions; everything outside it
    ├── ui-critique                        # a screen judged on screenshots by ss-design-critic, a11y each round, fixed until pleased
    ├── review, review-setup               # review's edges front hunts the cases a diff misses
    ├── orchestrate                        # one front across work sessions
    ├── caretake                           # the PRs that are not yours: the repo digest, or adopt or modernize one PR
    ├── learn                              # a lesson kept as a check, a review rule or a project fact; offered by /ss:go when a correction lands twice
    └── explain-the-number, attack-the-premise, prove-the-fix   # situational, loaded by trigger (references/triggers.md)
plugins/companion/                     # Telegram assistant service on the Agent SDK, adapted from the official channel plugin (Apache-2.0); UPSTREAM.md says how to pull fixes
```

### Naming Conventions

- Skills live in `plugins/ss/skills/<name>/SKILL.md`, invoked as `/ss:<name>`. Keep the dir name identical to the frontmatter `name`.
- A SKILL.md body (what follows its frontmatter) stays within 150 lines and 12,000 characters: the frontmatter, the opening, the steps as a short outline, and a pointer at each step to the `references/<topic>.md` it needs. Every file a body names exists. `.github/scripts/validate-skill-size.ts` checks both; its header says why the numbers.
- A skill's own `scripts/` and `references/*.md` are relative to the skill dir. Shared ones live at the plugin root and are written `<plugin-root>/...`; the SessionStart hook resolves that placeholder to the install path once per session.
- Project facts live under `## Project facts` in the repo's `CLAUDE.md` (or `AGENTS.md`); `plugins/ss/references/project-facts.md` is the contract, and only `/ss:learn` writes them.
- A situational skill carries `kind: situational` under `metadata` and one row in `plugins/ss/references/triggers.md`, the trigger table an agent reads first: every orchestrate brief, the bug-fix playbook and `/ss:ship` send it there. `.github/scripts/validate-triggers.ts` checks that every situational skill has a row and every row a skill. All three set `user-invocable: false`.
- A playbook is `plugins/ss/skills/go/playbooks/<name>.md` with `## Steps`, `## Route` and `## Endpoint`, whose steps run the skill that holds the method, and one row in the table under `## 1. Match a playbook` in `skills/go/SKILL.md`. `.github/scripts/validate-playbooks.ts` checks both ways.
- Hook commands reference files via `${CLAUDE_PLUGIN_ROOT}/...`, which only works inside `hooks.json`.

## Skills

Each skill is a folder with a `SKILL.md` containing YAML frontmatter (`name`, `description`, `license`, `metadata`) followed by Markdown instructions. The `description` field doubles as the trigger: it tells the agent when to invoke the skill.

### Scripting Principle

**Prefer Python scripts for deterministic operations** (parsing, formatting, data transformation, file manipulation, JSON processing) over having the LLM do it inline. Scripts run faster, cost zero tokens, and produce consistent results. Reserve LLM reasoning for judgment calls, synthesis, and creative decisions.

### Writing Guidelines

- Keep SKILL.md focused on the workflow and decision-making logic.
- Prose follows `plugins/ss/references/doc-style.md`.
- Keep guidance positive and lean. A single sharp caution is allowed where negation is genuinely the clearest signal; the ban is on catalogs of anti-patterns.
- Trigger descriptions should be specific: list exact phrases the user might say.

## Scripts

- Python scripts use `gh api graphql` for GitHub data (not the REST API directly)
- Scripts write to stdout (JSON or plain text) for the LLM to consume
- New scripts should use Python, stdlib only (no third-party imports)
- CI (`.github/workflows/validate.yml`) validates frontmatter, workflow scripts, agent names, the trigger table, the playbooks, skill size and named files, runs the scripts' unit tests and checks formatting

## Commits

- No AI attribution in commits, PRs, or code comments
- Conventional commit style: `<type>(<scope>): <description>`
- The commit scope is the skill name (`clarify`, `caretake`, …), `hooks` for the hook layer, `companion` for the Telegram plugin, or `repo` for repo-wide changes

## Project facts

- A situational skill never sets `disable-model-invocation: true`, because that stops agents from loading it. Hide it with `user-invocable: false` instead.
- Read a PR body with `gh pr view --json body` before `gh pr edit --body-file`. A blind edit replaces the whole description.
- A value read from a commit trailer, a PR body or a comment is checked against its expected pattern (a sha, a number) before it reaches `git` or `gh`.
- `start_session` ignores `use_worktree: true` when the session folder is not a git repo. A code session there creates its own worktree first.
