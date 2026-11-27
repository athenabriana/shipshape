# Prove each bug fix

Read by `/ss:ship` at Step 2b, when a commit in the diff range carries a `Repro` trailer.

A commit in the diff range that carries a `Repro` trailer fixes a bug, and ship does not open or finish the PR until each such fix carries its proof: the original failure shown red, then the same reproduction green, with a focused test that fails without the fix. The trailers and their form are `prove-the-fix`'s (`<plugin-root>/skills/prove-the-fix/SKILL.md`, "The commits"). A branch with no commit carrying `Repro` skips this step and ships as it does today.

1. **Find each fix's proof.** `git log --format='%H%n%(trailers)' <diff_range>` lists the fix commits with their trailers: `Repro`, `Repro-test`, `Repro-test-commit`, `Repro-proof`. A fix commit with `Repro` and any of the other three missing is a blocker: the fix did not land test first.
   - **Place each test commit** with `python3 <plugin-root>/scripts/patch_id.py --resolve <sha>`, one `--resolve` per `Repro-test-commit`. Each entry of `resolved` answers for one sha. `on_branch: true` is the sha as the trailer wrote it. Otherwise a history rewrite (`/ss:caretake`'s modernize mode) gave the test commit a new sha, and `match` is the branch's commit with the same patch-id: it stands for the test commit in every step below, and the proof section names both shas.
   - **`match: null` means the proof is missing**, a blocker as before. `available: false` says why: the old commit could not be read, locally or from `origin`, so its patch-id was never taken.
2. **`Repro-proof: local`** is enough: whoever built the fix saw the reproduction and the test fail, and both pass after the fix. It goes into the proof section as it stands, and CI only has to be green at the end.
3. **`Repro-proof: pending`** is proven by CI in two steps, one red run per pending fix, in the order their test commits sit on the branch:
   - Push the branch up to that test commit and no further: `git push origin <test sha>:refs/heads/<branch>`. On the PR path the PR opens here, at the test commit, by `references/ship-pr.md`'s create step, since many workflows run only on `pull_request`.
   - Wait for CI on that sha to finish (`python3 <plugin-root>/scripts/inspect_pr_checks.py`, or `gh run list --commit <sha>` on a branch with no PR). Push nothing until it finishes: a workflow with `concurrency: cancel-in-progress` would cancel the red run.
   - It counts only red, and only when the failure snippet names that fix's `Repro-test`. Record the run's URL and sha, then go on to the next test commit, and after the last one to the head.
4. **Every other outcome stops the ship**, with the PR left as it is and the blocker reported, never worked around:
   - CI green on the test commit: the test does not catch the bug.
   - CI red on another check: that red proves nothing about the bug.
   - No CI run appears for the test commit's sha: name the sha.
   - The fix is already on the remote (`git merge-base --is-ancestor <fix sha> origin/<branch>`) with no red run recorded: name the fix and hand the command that proves it by hand, a push of the test commit to a branch of its own (`git push origin <test sha>:refs/heads/<branch>-repro-<n>`) and a draft PR from it. Ship never force-pushes to put the test commit back on top.
   - The destination is a protected branch and you did not tell ship to push there: it cannot take the two steps.
5. **The proof section.** One block per fix, written into the PR description on the PR path and into the report on every path: the reproduction, the focused test, the red half (`local`, or the red run's URL at the test commit's sha) and the green half (`local`, or CI green on the head).
