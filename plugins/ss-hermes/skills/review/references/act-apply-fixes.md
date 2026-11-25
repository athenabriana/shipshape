# Action: apply findings, the regression guard

Applying a finding is where a review can cause the next bug. This pass is conservative: a
cleanup that changes behavior is a defect, and a fix not justified against its finding is a
guess.

## The guard

- **One change per commit.** Apply edits one at a time and commit each on its own, so CI
  isolates a regression to one commit. Checks run in CI after the push, not locally.
- **Justify before you touch.**
  - A **correctness fix** maps to its finding: state the trigger the finding named and how
    the edit closes it.
  - A **quality edit** is behavior-preserving: same inputs, same outputs, same side effects.
    If you cannot say why, do not make it.
- **Untested code is higher risk.** With no test covering the touched code, keep edits
  trivial, add a focused characterization test first, or **leave it and flag it**.
- **Watch the classic traps**: changed evaluation or short-circuit order; truthiness or
  coercion shifts when collapsing conditionals; removing "dead" code that has side effects;
  merged error handling that now propagates different errors the same way; changed async
  ordering; off-by-one when refactoring a loop or range.
- **When in doubt, leave it and flag it.** A missed cleanup costs nothing; a regression costs
  trust.

## Order of operations

1. Front order: correctness fixes first (every one a Bloqueante), then Bloqueante rule
   deviations, then Bloqueante a11y and design findings, then contract gaps, then the rest of
   a11y and design, then quality edits. Within a front, Bloqueantes before Sugestões
   (`<plugin-root>/references/finding-levels.md`).
   - A **rule deviation** is fixed the way the cited rule states it, and the commit body
     quotes the rule ID. When following the rule would change behavior, treat it as a
     correctness fix and justify it as one.
   - A **design deviation** is fixed with what the cited source names (the token, the DS
     component, the documented state), and the commit body cites the source.
   - A **contract gap** is closed by building the missing behavior or test. When an
     `AGENTS.md` fact itself is wrong, ask the person through `clarify` before touching it;
     it is not a review edit.
2. Scope stays the code this branch already changed. No refactoring of untouched code.
3. Match the surrounding naming, error envelopes, and patterns.
4. Before each commit, re-read the staged diff: nothing unrelated changed, nothing removed
   that the finding did not ask to remove. Commit in conventional style with no AI
   attribution. In the loop, the body carries `Review round N.` and nothing naming a
   reviewer or model.
5. Push to the PR branch (never a protected branch, never `--force`). Thread replies go out
   after the push so the sha is real. In the loop the push happens once, after the last round.
6. Follow CI after the push: `gh run watch RUN_ID --exit-status` in
   `terminal(background=true, notify=true)`, and put the result in the re-report.

Anything held back as too risky goes in the re-report as flagged, never silently dropped.
