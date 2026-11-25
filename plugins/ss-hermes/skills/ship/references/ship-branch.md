# Ship to a feature branch

Reached from ship's Step 6 when the destination is a non-protected branch. The work is
committed.

1. Confirm the target: the current branch, or the new name the person gave. When the target
   is protected, stop and switch to `references/ship-main.md`.
2. Push: `git push -u origin BRANCH`. A rejected push (the remote moved) gets
   `git pull --rebase origin BRANCH` and a second push. Never `--force`.
3. Follow CI with `references/follow-ci.md` until green, or until it stops after three
   failed fix cycles.
4. Report what shipped: commits, files, the checks CI ran and their result with the run URL.
   No PR is opened. To get one later, ship again with the PR destination.

Pushing a feature branch is reversible, so ship runs it. Merge, approve and force-push stay
the person's.
