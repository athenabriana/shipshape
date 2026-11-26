# Ship Shape

A **Claude Code plugin** (`ss`) published through a one-plugin marketplace (`shipshape-skills`). Install via `claude plugin marketplace add athenabriana/shipshape` then `claude plugin install ss@shipshape-skills`. Skills are invoked as `/ss:<skill>` (e.g. `/ss:ship`). The flow is shape → build → ship. The plugin ships a `SessionStart` operating-context hook, auto-active when the plugin is enabled.

## Structure

```
.claude-plugin/marketplace.json        # lists the single `ss` plugin
plugins/ss/
├── .claude-plugin/plugin.json
├── agents/                            # read-only roles dispatched as ss:ss-<name>
├── hooks/                             # session infra (auto-active, no skill)
│   ├── hooks.json                      # SessionStart context injection
│   ├── inject_context.py               # emits operating-context.md + the <plugin-root> line
│   ├── operating-context.md            # the injected operating frame (edit to tune)
│   ├── enter_worktree.py               # worktree isolation for local autonomous runs
│   └── scheduling-decision.md          # /loop vs Desktop task vs Cloud Routine decision table
├── references/                        # plugin-level docs shared across skills (project-facts, handoff-gate, doc-style, triggers, ...)
├── scripts/                           # plugin-level scripts shared across skills (preflight, check_project_facts, ...)
└── skills/
    ├── shape, ship, record-fact
    ├── diagnose
    ├── review, review-setup
    ├── gather-branch-context, caretake, takeover, research, write-readme, orchestrate
    └── explain-the-number, attack-the-premise, prove-the-fix, correct   # situational, loaded by trigger (references/triggers.md)
```

### Naming Conventions

- Skills live in `plugins/ss/skills/<name>/SKILL.md`, invoked as `/ss:<name>`. Keep the dir name identical to the frontmatter `name`.
- A skill's own `scripts/` and `references/*.md` are relative to the skill dir. Shared ones live at the plugin root and are written `<plugin-root>/...`; the SessionStart hook resolves that placeholder to the install path once per session.
- Project facts live under `## Project facts` in the repo's `CLAUDE.md` (or `AGENTS.md`); `plugins/ss/references/project-facts.md` is the contract, and only `/ss:record-fact` writes them.
- A situational skill carries `kind: situational` under `metadata` and one row in `plugins/ss/references/triggers.md`, the trigger table an agent reads first: every orchestrate brief, `/ss:diagnose`, `/ss:ship` and `/ss:correct` sends it there. `.github/scripts/validate-triggers.ts` checks that every situational skill has a row and every row a skill. `correct` stays in the menu as `/ss:correct`; the other three set `user-invocable: false`.
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
- CI (`.github/workflows/validate.yml`) validates frontmatter, workflow scripts, agent names, the trigger table, runs the scripts' unit tests and checks formatting

## Commits

- No AI attribution in commits, PRs, or code comments
- Conventional commit style: `<type>(<scope>): <description>`
- Scope is the skill name (`shape`, `caretake`, …), `hooks` for the hook layer, or `repo` for repo-wide changes
