# Ship to main or another protected branch

Reached from ship's Step 6 when the destination is a protected branch. The work is committed.
Ship stops at the hand-off: a push to a protected branch is the person's, and branch
protection usually enforces it on the server.

Nothing is pushed, so CI has not run on these commits yet.

1. **Offer a CI run first,** when a workflow triggers on push to any branch (read the `on:`
   block of `.github/workflows/*.yml`). Ask with `clarify`:
   - **Run CI on a scratch branch first** (recommended): push the commits to
     `ci/SHORT_SHA` (`git push origin HEAD:refs/heads/ci/SHORT_SHA`), follow it with
     `references/follow-ci.md`, fix what fails, then hand off. Delete the scratch branch
     after the hand-off (`git push origin --delete ci/SHORT_SHA`).
   - **Hand off now:** CI runs for the first time when the person pushes.

   When no workflow triggers on a branch push, skip the question and say CI first runs on the
   person's push.

2. **Show the summary:** commits, files, and the CI result (the scratch run's URL, or "not run
   yet").
3. **Hand off the exact command,** for example `git push origin HEAD:main`, or
   `git -C REPO_PATH push origin BRANCH` when the person is in another directory. When branch
   protection requires a PR, say so and offer the PR destination instead.

Ship never runs the protected-branch push, and never merges or force-pushes.
