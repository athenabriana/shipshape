# The goal loop: clarify the goals, build, judge, fix, repeat

Work that runs long runs against goals the person approved before the first edit.
`/ss:clarify` maps the problem and the code, proposes verifiable goals and has them approved
once; the session builds, and then a fresh judge checks every goal and the quality of the result, round after
round, until every goal is achieved and the judge is pleased. There is no default round
limit. This page is the single source of that loop: what a goal is, when goals are
approved, how a round runs, how the loop survives a restart, and when it stops.

Each skill runs it in its own terms. `<plugin-root>/references/design-loop.md` is the
interface specialization (screenshots and the `ss-design-critic`), `/ss:review`'s loop
(`<plugin-root>/skills/review/references/loop.md`) is the code specialization (the
`ss-review-judge`), and the table at the end says what every other skill takes from here.

## When it runs

- **`/ss:go` on the standard and intensive routes**: every playbook that changes something
  opens with the map and the goals and ends with this loop. The lightweight route keeps
  its own steps and needs no goals.
- **`/ss:review`'s loop**, on the current branch, at every depth.
- **The design-review loop** of `design-loop.md`, on every interface change, and
  `/ss:ui-critique`.
- **A work session of `/ss:orchestrate`**: the brief carries the goals, and the work is
  done when they are achieved.
- **Any long run** of `<plugin-root>/references/long-run.md` whose goal is clear.

A tiny mechanical change, a read only question and a lightweight route skip it.

## 1. Define the goals: `/ss:clarify`

The goals come from `/ss:clarify`, the goal-definition step of this loop: it maps the problem
and the code, proposes verifiable goals and what is out of scope, and has them approved
once. Every skill that needs goals calls it, and its blocks join the caller's opening
sheet. Goals that already exist skip it: a brief or a front that carries approved goals, a
PR description, a spec or acceptance criteria with WHEN/THEN lines (`/ss:clarify` adds only what
they leave out), or a playbook's own goals (the bug-fix playbook's reproduction and focused
test). This page says what a goal is and how it is judged; `/ss:clarify` says how the goals
are found.

### Goals that live in a doc

For big work, `/ss:clarify` writes the goals into a private Claude Docs doc (or `goals.md`
when the Docs tools are missing), by "What the doc holds" in its `SKILL.md`, and hands its
URL or path over with the goals. The loop records it in `state.json` as `goals_doc`, and
the doc is where the goals live for the whole loop:

- **The session reads the goals from the doc at the start of each round**, with the Docs
  `read` tool (loaded with `ToolSearch` by its bare name), or `Read` for `goals.md`. The
  judge's prompt carries the goals as the doc has them, never the link: the judge agents
  only read files. When the Docs tools fail mid-loop, the round uses the goals in
  `state.json` and says so in its line.
- **An edit the person made in the doc is their word.** The session compares the doc's
  goals with the ones in `state.json`; a goal that differs is judged as edited from this
  round on, copied into `state.json`, and named in the round's line and the report.
- **The session writes each goal's status back** after the judge returns, in its `status:`
  field in `## Goals`: `open` until judged, then `achieved`,
  `not achieved: <what is missing>` or `deferred: <ground>`. Each PR, branch or commit goes
  under `## PRs and commits` as it lands. These are routine updates: the doc is opened for
  the person when clarify creates it and again with the report, not after every round.
- **A front keeps its goals in the front doc**, by `<plugin-root>/references/front-doc.md`,
  and no goals doc is made. A work session never opens the front: its goals come in the
  brief, it reports their status in its `Goals:` line, and the orchestrator writes that
  into the front doc.

## 2. What a goal is

A **goal** is one observable result the work must reach, written so a judge with no memory
of the run can check it. Each goal carries:

- **A number**, `G1`, `G2`, …, kept for the whole loop.
- **One WHEN/THEN line**, in the words of the product: `WHEN a visitor submits the form
with an empty email THEN the field shows "Enter your email" and nothing is sent`.
- **Its check**: how a judge confirms it, one of a test (its name, or the one to write), a
  command and the output it must print, a screenshot of a named state, or a cited source
  (a `file:line`, a URL and the passage). A goal nobody can check is rewritten until
  somebody can, or dropped.

Goals are few and load-bearing: a goal per point the work must answer, not one per line
of code, with the standing goals of the kind of work among them (WCAG AA on an interface,
the review gate on a PR).

**A deferred goal** is one this run cannot check, with a ground the next judge can read:
a build-only goal on a mockup (`design-loop.md` says which), a check that needs production
data or a service this session cannot reach. It is marked `deferred` with its ground at
proposal time, it holds back nothing, and the report carries it forward. A goal is never
deferred mid-loop to make the loop end. A goal the loop finds it cannot reach (it needs
production data, a service or an access this session lacks, and was not deferred at
approval) is a real blocker by `long-run.md`: ask that one question, with the evidence and
"defer it" as the recommended pick, and defer it only on the person's word. Until the
answer, the loop works on every other goal.

## 3. Check the goals, then approve them once

Read the goals against their sources once, before any build: the request, the brief, the
decisions file, the code. A contradiction between two sources is raised in the same sheet,
each side quoted with its file and line and the recommended pick first.

The person approves the goals once, in the opening decision sheet of `long-run.md`, beside
every other open question: one block that lists the numbered goals with their checks, the
deferred ones with their grounds, and the default "Approve these goals" first. The person
can edit a goal, drop one or add one in the same answer. After that the goals are fixed
for the run, and the session asks again only on a real blocker, such as a finding that a
goal itself is wrong. The one change that needs no ask is an edit the person makes in the
goals doc themselves, by "Goals that live in a doc" above.

- **In a work session**, the block travels in the opening `ss.ask` JSON to the
  orchestrator, by `<plugin-root>/references/front-contract.md`. A brief that already
  carries approved goals needs no block: they are the goals, copied as written.
- **When nobody can answer** (a `/ss:research` run called by an agent, a watcher's tick),
  the session takes its own proposal, writes it in the report, and names it under "decided
  on my own".

## 4. Build

Build against the approved goals, step by step, with `Agent` subagents where the steps run
side by side. Each goal's check is part of the build: the test is written, the command is
ready to run, the state is reachable for a screenshot.

## 5. A round: a fresh judge checks every goal and the quality

Each round sends one **judge**: fresh, memoryless, and not the session that built the work,
as hard to please in the last round as in the first. Its prompt carries the work to judge,
the numbered goals copied as approved with their checks and the deferred ones with their
grounds, the open findings and refusals from the last round, and the round's scope (below).
It never carries the builder's opinion, a self-score or the history of the build. Which
agent judges is the specialization's: the `ss-review-judge` for code, the
`ss-design-critic` for an interface, an independent verifier for research.

The judge returns, every round:

- **Each goal**, one by one: `achieved` (with the evidence: the test that passed, the
  output, the screenshot, the quoted line), `not_achieved` (with what is still missing), or
  `deferred` (only for a goal marked deferred at approval, with its ground).
- **Findings on quality**, each with its level, its location and its evidence.
- **`pleased`**: true only when it would send nothing back.

The session runs each goal's check where the judge cannot (a test, a command) and hands it
the output; the judge reads the output, never the session's word for it.

## 6. Fix in batches

- **Close every goal** marked `not_achieved`, from what the judge says is missing.
- **Fix every finding**, from the most severe down. A finding that asks for evidence the
  judge did not get is fixed by giving it.
- **Fix in batches.** Group the round's findings that share a cause (the same function, the
  same token, the same pattern across files) and fix each group in one change, at its
  cause. List the groups in the round's line, each with the findings it closes.
- **Refuse a finding only with a ground** the next judge can check: it contradicts an
  approved goal or the person's request, quoted, or it asks for work outside the scope. A
  refused finding goes to the next round with its ground.
- **End the round at a clean step**: the change committed, and the loop folder written.

## 7. Scoped rounds, then a full pass

Round 1 judges everything. Each round after it is **scoped**: the judge reads what changed
since the last round, every open finding, and every goal the change could touch, with the
rest given for context only.

When a scoped round comes back pleased, with every goal achieved or deferred, the next
round is a **full pass**: the whole work, every goal, as in round 1. Only a full pass can
end the loop, so nothing regresses unseen. A full pass that leaves a goal not achieved, or
that the judge is not pleased with, goes back to scoped rounds. What the judge's own rule
lets it be pleased with despite (the review judge's Sugestões) is decided in that same
round and opens no further round.

## 8. Convergence

After each round, count what is open: the findings by level and the goals not achieved.
Add the total to the trend in the loop folder. Each round's line in the task list and the
report shows both: "round 3: goals 5 of 6 achieved, 7 findings open (Bloqueante 1,
Sugestão 6); trend 15, 11, 7". A round that grows is normal when fixes surface what nobody
asked about yet; the trend lets the person see where it is heading and set a cap if they
want one.

## 9. The loop folder, and resuming after a restart

A loop runs long, and the scratchpad can be cleared mid-run. Everything the loop needs to
go on lives in one durable folder: the notes folder the brief names, else
`~/.ss/runs/<slug>/`, with `<slug>` from the work's name. Never the scratchpad.

```
<loop folder>/
├── state.json        # the approved goals, goals_doc (kept in every write), the round, its scope, open findings and refusals, the trend, agent ids
├── rounds/r<N>/      # what each round judged: check outputs, screenshots, the judge's return
└── tools/            # any script the loop writes
```

`state.json` is written after each step of a round: each check run, each agent dispatched
(its id from the `Agent` result) and each agent's return. On a restart, read it first and
never start round 1 over. An agent that was dispatched and has no return is resumed with
`SendMessage` to its id, asking it to finish and return; only when that fails is it
dispatched fresh, with the same prompt. A check output missing from the round's folder is
run again before anything is judged.

## 10. When the loop stops

- **Every goal is achieved and the judge is pleased**, in the same round, and that round is
  a full pass. Done.
- **The usage window runs low**: stop at a clean step (committed, pushed, the loop folder
  written, reported), by `long-run.md`, and say where the loop stands and the reset time.
- **The person's cap is reached**: a cap they set in the request or the brief ("at most 3
  rounds"), copied word for word.

Nothing else stops it. The one standing cap is `/ss:research`'s, which runs with nobody
to ask: its three verify rounds stop it, and the questions still open go to its report's
open section. Without a cap the loop keeps going, round after round, however many
rounds that takes. A loop that stops short reports the goals not achieved and the open
findings as they are, and never calls the work done.

## 11. Report

- **The goals doc**, when the goals live in one: its statuses current, and the doc opened
  for the person by `<plugin-root>/references/show-for-review.md`.
- **The goals line**, one per run: `Goals: 5 of 6 achieved, G4 deferred (needs production
data), none open.` Each goal not achieved is named with what is missing.
- **The judge's last verdict** and how many rounds ran, the last one a full pass when the
  loop ended pleased.
- **The fix groups** of each round, with the findings each one closed.
- **The trend**: what was open per round, first to last.
- **Carried forward**: each deferred goal with its ground.
- **What is still open**, one line per finding with its level, and the refusals with their
  grounds.
- **Decided on my own**, by `long-run.md`, including any goal the session added or
  approved alone.

## How each skill adopts it

| skill or playbook | the goals                                                                                                          | the judge and the end                                                     |
| ----------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| `/ss:go`          | standard and intensive routes: `/ss:clarify` first, its blocks in the opening sheet                                | the playbook's own judge; the endpoint waits for every goal achieved      |
| `/ss:review`      | the change's goals, from the PR description, the brief, the linked spec or acceptance criteria; else proposed once | `ss-review-judge`, every goal plus the findings, no default round limit   |
| design loop       | the brief's goals, WCAG AA always one of them                                                                      | `ss-design-critic`, `goals_achieved` and `pleased`, by `design-loop.md`   |
| `/ss:ui-critique` | asked once in its opening sheet, through `design-loop.md`                                                          | the critic and the `ss-a11y-auditor` each round                           |
| `/ss:clarify`     | it defines them, approved once; big work gets a goals doc the loop reads and updates each round                    | none of its own: the caller's loop, or on its own the build that follows  |
| `/ss:bug-fix`     | the reproduction fails before the fix and passes after, plus the focused test                                      | the review loop on the fix, every goal checked                            |
| `/ss:research`    | the plan's questions, each answered with verified evidence                                                         | the claim verifier, within its own cap                                    |
| `/ss:ship`        | the final goal is the review gate                                                                                  | the `/ss:review` loop on the PR's head                                    |
| `/ss:babysit`     | the final goal is the review gate                                                                                  | a tick reports the gate, and calls the PR ready only when it passes       |
| `/ss:caretake`    | adopt mode: the final goal is the review gate                                                                      | `/ss:ship`'s PR path, then the review loop                                |
| `/ss:orchestrate` | the front's goals go into each brief                                                                               | a work session's done means its goals were achieved, by its `Goals:` line |
