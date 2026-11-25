# Follow CI to green

Reached after every push ship makes. The checks run in CI, never locally, so a push is how
they run. Read the sections in order: find the run, follow it, judge the result, fix what
failed.

## Find the run

- **With a PR:** the PR's checks are the run. Go to "Follow it".
- **Without a PR:** list the runs for the pushed commit:

  ```bash
  gh run list --branch BRANCH --commit SHA --json databaseId,workflowName,status,url
  ```

  A run can take a few seconds to register. When the list is empty, wait once in the
  foreground (`sleep 20`) and list again. Still empty means no workflow triggers on this
  push: read the `on:` block of `.github/workflows/*.yml`. A workflow that runs only on
  `pull_request` gets no run until a PR exists. Say so in the report instead of calling the
  branch green.

## Follow it

Start the watch as a background process that notifies you when it exits, never as a sleep or
poll loop:

- **With a PR:** `terminal(background=true, notify=true)` with
  `gh pr checks PR_NUMBER --watch --interval 30`.
- **Without a PR:** one `terminal(background=true, notify=true)` per run with
  `gh run watch RUN_ID --exit-status`.

Then end your turn with one line: what is building and where (the run or PR URL). The
notification resumes you. Review threads that arrive meanwhile can be triaged while the
checks build.

## Judge the result

Green means every check reached a terminal state and each one passed.

- **Pending:** not green yet. Keep following.
- **Cancelled or skipped required check:** not green. It finished without a verdict: report
  it as a gate that never ran.
- **No checks at all:** say "no CI ran" in the report. That is not the same as green.
- **Not GitHub Actions** (Buildkite, CircleCI and others): report the details URL and leave
  it to the person. Do not debug it.

## Fix what failed

Read the failure before touching any file:

```bash
python3 <plugin-root>/scripts/inspect_pr_checks.py --repo . --pr PR_NUMBER
```

`--pr` also takes the PR URL; a babysit tick passes the URL, since its branch does not map to
the PR. It prints each failing check with its run id and a log snippet, and exits non-zero while
failures remain. Without a PR, read the log with `gh run view RUN_ID --log-failed`. With
several failures, read all their logs before you change anything. To split that across
checks, use `delegate_task`, one read-only child per failing check with `"option": "sonnet"`,
each returning the root cause with the log line that shows it. Set that `option` only when
`hermes delegation config --show` lists a `sonnet` route and this session's `delegate_task`
offers it; otherwise leave it out (Hermes refuses a call with an option it does not offer).
A child is an ephemeral
subagent with no memory, so its brief carries the repo, the run id and the check name.

1. Name the root cause with a specific log line. A guess costs a whole CI cycle.
2. Fix it with the smallest change. Where the failing code has no test covering it, keep
   the edit trivial and obvious, or leave it and report it: reworking untested logic to green
   a check trades a red build for a silent one.
3. Run the preservation check, commit (`fix(SCOPE): ...` or `ci: ...`), push, and follow the
   new run from "Follow it".

**Stop after three failed fix cycles** on the same check. Report the diagnosis of each
attempt with its log line, and leave the call to the person. Pushing to a non-protected
branch is reversible, so ship pushes fixes without asking. It never force-pushes.
