# Route rules

Step 2 of `/ss:go` (size the route) reads this page once the route is known, before the
first edit. It holds what every route adds around the route table: the review gate on the
open PR endpoint, the goals and the goal loop, the overrides, and the mechanical gate.

## The review gate on the open PR endpoint

On the open PR endpoint, every route ends with the `/ss:review` loop on the PR's latest
head, once CI is green, before the handoff: a PR never goes up for merge without it
(`<plugin-root>/references/review-gate.md`). Deep depth when the change touches tokens,
secrets, auth, permissions, servers or money, standard otherwise, said in one line.

## Goals on the standard and intensive routes

Every playbook on these routes opens with the map and the goals and ends with the goal
loop, by `<plugin-root>/references/goal-loop.md`:

- **First**, before the first edit: run `/ss:clarify`, which maps the problem and the code and
  proposes verifiable goals (numbered WHEN/THEN lines, each with its check: a test, a
  command, a screenshot or a cited source) and what is out of scope. Its blocks join the
  opening decision sheet, "Approve these goals" recommended, beside the endpoint and every
  other open question. Goals that already exist skip it, by `goal-loop.md` section 1: a
  brief that carries approved goals (a work session asks nothing about them), and a
  playbook's own goals (the bug-fix playbook's reproduction and focused test), which stand
  without a question unless the request leaves an outcome open.
- **Last**, before the endpoint: the playbook's judge (`/ss:review`'s loop, the design
  critic) checks every goal each round, with no default round limit, until every goal is
  achieved and the judge is pleased, or the usage window or the person's cap stops it. The
  close carries the `Goals:` line.

The lightweight route keeps its steps as they are, with no goals. A playbook with no route
(investigate, babysit, review-setup, learn) runs its skill's own terms.

## Overrides

The playbook's own `## Route` section says how this applies to it, and wins where it differs.
"Keep it light" or "be thorough" from the person overrides the script. Say which route you
are on and why, in one line.

## Mechanical gate

The cheap, objective checks come before any review front. The repo's
pre-commit hooks run on commit. The rest of the gate is the project's checks, which
`<plugin-root>/scripts/resolve_checks.py` names: run them locally when they are cheap and
the repo's or the machine's `CLAUDE.md` allows it, or push and let CI run them. Push only
when the endpoint or the playbook's scope allows it, then follow the run to the end with
`Bash` `run_in_background` (`gh run watch <id> --exit-status`) and fix what it surfaces. An
endpoint of "local commit" with no local run leaves the checks unrun; say so in the
close.
