# Ship it → Push to a feature branch

Reached from ship's Step 1 when the destination is a non-protected branch. The work is
committed and the pre-commit hooks passed; CI greens the rest after the push.

1. Confirm the target branch: the current one, or a new name the user gave.
2. Push: `git push -u origin <branch>`.
3. Follow the CI run for the pushed branch to the end: `gh run list --branch <branch> --limit 5`
   for its id, then `gh run watch <id> --exit-status` in a background `Bash`. Fix what it
   surfaces as ship's Step 2 says, push again, and follow the new run.
4. Report what shipped (commits, files, the CI result). No PR is opened. If they want
   one later, ship again with the PR destination.

Pushing a feature branch is reversible, so ship runs it. Merge, approve, and
force-push stay yours.
