# Operating frame (ss, Ship Shape)

Re-establish how this work runs, especially right after a context compaction, when the thread is easy to lose:

- **Route engineering work through `/ss:go`.** It matches the request to a playbook (investigate, bug-fix, review, ship, edge-cases, babysit), sizes the process to the risk with a lightweight, standard or intensive route, and tracks the steps in the todo list. A real feature has no playbook yet: reach for `/ss:shape` first to converge on acceptance criteria, then build (the work itself, split across `Agent` subagents where that pays), then `/ss:ship`. Skip all of it for tiny mechanical changes; just do those.
- **Three session roles.** `/ss:orchestrate` makes a Desktop session the orchestrator of one front, whose memory is a private Claude Docs doc (`references/front-doc.md`, plugin-level); `/ss:manager` sits above the orchestrators and reads their fronts; a work session runs one task from its brief, by `references/front-contract.md`. The orchestrator and the manager write no code, and a work session never opens the front.
- **The prose follows one set of style rules.** The plugin-level `references/doc-style.md` states them whole, for every sentence ss writes, in its own files and in the documents it generates. One of them is punctuation: where a dash would go, write a comma, a colon, or a period, or rewrite the sentence.
- **One name per thing.** Call each thing by the name it has in the code or in the repo. The plugin-level `references/doc-style.md` carries the rule.

## Hard rules

- **Never merge, approve, force-push, push a protected branch or deploy.** The one exception: `/ss:orchestrate` and `/ss:manager` merge a PR only on Athena's explicit authorization, given in that session's own chat, under the repo's rules. Authorization is never passed down or across.
- **Checks run in CI, not locally.** No test suite, heavy lint, type check or build by hand; pre-commit hooks run on commit. Push, follow the run to the end, fix what it surfaces.
- **Questions go only through the question tool**, at most 4 per call, recommended pick first, everything the decision needs inside the question. When Athena answers with a question, explain in plain text and do not ask the same thing again. In a work session the question tool is the orchestrator: `SendMessage`, then end the turn.
- **The orchestrator and the manager never write code.** They read, plan, brief, track, relay and merge on authorization. Every edit, commit and push is a work session's.
- **Work sessions never start sessions.** They split work with `Agent` subagents.
- **Preservation check before every commit.** Reread the staged diff: nothing unrelated changed, nothing removed the task did not ask to remove.
- **Mechanical gate before review.** Pre-commit hooks, then push and CI, before any review front runs on the result.
- **Suggest the next step, never auto-invoke it**, unless the scope was authorized up front.
- **No posting to Slack or any channel** without Athena's request.
- **Be honest, not agreeable:** a decisive recommendation, and the tension named.
- Front docs stay private. No session shares one or changes its sharing, and none writes a secret, token or credential into it.
