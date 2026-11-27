# Commit, then green the project's checks

Read by `/ss:ship` at Step 2, on every destination, before naming the checks.

This runs identically whatever the destination; it's the mechanical half of
shipping, and the only work ship does to the code on its own.

**This step does not review.** No fan-out of finder agents, no fronts, no verify pass:
reading the change is `/ss:review`'s. It runs on this branch before ship starts when the
person asks for it, and on the PR path ship runs its loop at the end, once CI is green,
when no verdict covers the head (`references/ship-pr.md`, "Run the review loop"). What
this step owns is the part with no judgment in it: the checks CI would run anyway, and a
clean commit.

1. **Name the project's checks, then pick where they run.** The repo's pre-commit hooks run
   on commit. `python3 <plugin-root>/scripts/resolve_checks.py` walks the authority chain
   its own docstring states, without running anything, and prints
   `{commands, source, truncated, resolved_count, runnable, policy, notes, unresolved, candidates, git_root}`.
   Read it to say which checks run on this branch, then pick one of two ways, ship's
   choice: run `runnable` locally before the push when they are cheap and nothing forbids
   it, or push and let CI run them. When `policy` forbids local runs, the repo or the
   machine has decided: CI runs them. An empty `commands` is a real
   answer: some repos have no CI and no build. **`source` tells the two empties apart**:
   `null` means no tier resolved anything. **`unresolved`** lists commands the script saw
   and could not resolve (`reason`, `where`): open `where` before saying the project has no
   checks. `policy.scope` says who forbids local runs (`repo` or `machine`) when it matters
   to the report.

2. **Fix what the checks report**, locally or in CI after the push, in the main context, one
   change at a time. A red check is a blocker: it gets fixed or it stops the ship. Where the failing
   code has **no test covering it**, keep the edit trivial and obvious or leave it and report
   it. A check still red after **3 focused attempts** stops the ship: report what's failing,
   with the log, and let the user call it. The destination's reference says how the run is
   followed; a destination ship does not push to (a protected branch) hands CI to whoever
   pushes.

3. **Nothing to green before the commit** beyond the pre-commit hooks: if a hook fails, fix
   what it reports and commit again.

4. **Commit** in logical units (conventional style; no AI attribution).
