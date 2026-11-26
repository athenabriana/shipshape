# Project facts

A _project fact_ is a durable thing about a repo that its code cannot show: a choice, a
trap, a constraint, an outside rule. Each fact is one short line in the repo's agent
instructions file, so every session loads it at start. This page is the contract: which
file holds the facts, which facts go in, the form of a line, who writes it, and the check
that keeps the file from growing.

The old `.ss/<slug>/spec.md` files and the `.ss/wiki` folder were removed in 5.0.0; project facts replace the wiki.

## Which file

Look at the repo root in this order, and write to the first file that exists:

1. `CLAUDE.md`
2. `.claude/CLAUDE.md`
3. `AGENTS.md`

With none of the three, create `AGENTS.md`.

Claude Code reads `AGENTS.md` on its own only in a project with no `CLAUDE.md`. So a repo
with both files gets the fact in `CLAUDE.md`, the file its sessions load. Add no
`@AGENTS.md` import: the order above already puts every fact in a file that loads.

## The filter

A fact goes in only when all three hold:

1. **The code cannot show it.** A choice, a trap, a constraint, or an outside rule that a
   reader of the code would not find there.
2. **It will matter again.** Later work in this repo will meet it.
3. **Getting it wrong is costly.** A session that misses it breaks something, loses work,
   or repeats a mistake.

A candidate that fails any of the three stays out, and the person hears which one it
failed.

## The form

- Write one short line per fact, under a `## Project facts` heading. Create the heading
  once, the first time a fact goes in.
- Keep status, history, PR numbers, and dates out of a line. A fact states what holds now.
- Merge a new fact into the line that covers the same ground, or replace that line. Two
  lines on the same ground never sit side by side.
- Ask the person to approve each exact line through `AskUserQuestion`, with the line quoted
  in the question. The file changes only on their yes.
- Keep the section to about 60 lines. Past that, propose a consolidation of the existing
  lines before any new line goes in.
- Send review rules to `CODE_REVIEW_GUIDE.md` through `/ss:review-setup`. They do not go
  here.

## Who writes

Only `/ss:record-fact` writes a project fact. A playbook calls it at its close when the run
learned something that passes the filter, and the person calls it directly as
`/ss:record-fact`.

In a front of `/ss:orchestrate`, the work session sends the proposed line to the
orchestrator through `SendMessage`, as `references/front-contract.md` describes, and the
orchestrator asks the person. The session writes the line only after the person's yes, on
its own branch.

## The growth check

`<plugin-root>/scripts/check_project_facts.py` reads the facts file and a diff, and prints
JSON:

```bash
python3 <plugin-root>/scripts/check_project_facts.py REPO --diff-range RANGE
```

It reports the facts file it found, whether the repo has both `CLAUDE.md` and `AGENTS.md`,
the line count of the facts section, the lines the diff adds to the facts file, and one
flag per problem:

| flag       | when                                                            |
| ---------- | --------------------------------------------------------------- |
| `over_cap` | the facts section holds more than 60 lines                      |
| `dated`    | an added line holds a date                                      |
| `numbered` | an added line holds a PR or issue number                        |
| `status`   | an added line holds a status word, like `done` or `in progress` |
| `too_long` | an added line runs over 160 characters                          |

`/ss:review`'s rules front runs it on every diff that touches `AGENTS.md` or `CLAUDE.md`,
and reports each flag as a finding. The script always exits 0: a problem it meets, like a
directory that is not a git repo, goes in the `errors` list of its JSON.
