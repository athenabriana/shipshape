# Ship it → Push to main (or another protected branch)

Reached from ship's Step 1 when the destination is a protected branch. Everything is
committed and the pre-commit hooks passed. Ship stops here and hands off, because good practice (and
branch protection, typically) reserves shipping to a protected branch for a human.

1. Show the summary: commits, files, and the checks CI will run.
2. Hand off the exact command, e.g. `git push origin HEAD:main` (or
   `git -C <repo> push origin <branch>`).
3. Note that CI will run on push.

By default ship hands you the protected-branch push. It runs the push itself only when you
say so in its chat, under the repo's rules, and force-pushes only when you ask for it in so
many words.
