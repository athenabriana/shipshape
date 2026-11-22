# Landing

The orchestrator follows every PR the fronts open. This page covers following CI, when
the orchestrator merges and how, the order fronts open and land in, and repos that
release on every merge.

## Follow CI

Each side session opens its PR with Auto-fix on, so the app wakes it on CI failures,
review comments and conflicts. The orchestrator follows each PR's checks with
`gh pr checks` or `gh pr view`, tells the person when one turns green or stays red, and
sends a stuck failure back to its side session.

## Merge only what the person authorized

A merge is the person's action. The person authorizes it in this conversation, so this
session executes it, and only when all of these hold:

- **The person authorized this PR explicitly**, in one of two forms: for that PR, or for
  the run with the PRs or the fronts it covers named ("merge the copy and the Linux
  release PRs when they turn green"). A PR the authorization does not name is not
  covered: report it green and ask.
- **CI is green** on the head commit.
- **The review verdict still covers that head**, by the patch-id comparison below, when
  the PR records one.
- **The repository's own rules allow it**: the reviews it requires, its branch protection,
  and any rule in its `CLAUDE.md`, `CONTRIBUTING.md` or review guide. Never bypass one,
  with `--admin` or any other way.

**Say it before each merge**, every time, in one line: "Merging #N at head X." The person
sees each merge as it happens, even under an authorization given earlier.

Where the repository's rules forbid an agent merge, or require something only the person
can do, hand the person the command and say what it waits on.

## Compare the patch-id before a merge

A front's review loop records its verdict in the PR description with the patch-id of the
change it read (`<plugin-root>/skills/review/references/loop.md`, "The verdict line").
Before each merge, run this in your checkout:

```bash
python3 <plugin-root>/scripts/patch_id.py --pr PR_NUMBER
```

It fetches the PR's head and base, measures the patch-id of the diff from their
merge-base to that head, reads the verdict line, and prints
`{head, base_branch, base_ref, merge_base, patch_id, pr, recorded, unchanged}`.

- **`recorded: null`**: the PR has no recorded verdict. Land it as before.
- **`unchanged: true`**: the verdict holds, even when the front merged the base in since.
  Read `recorded.verdict`. `open` means Bloqueantes the loop left unsettled: do not merge,
  bring them to the person from the description, and send them to the front. `clean` and
  `disputed` merge with `head` pinned, after checking CI is green on that same sha, and a
  `disputed` one names its disputed refusals to the person first.
- **`unchanged: false`**: the review read code that has changed since, such as a CI fix, a
  conflict resolution or a thread fix. Do not merge. Ask the front to review the delta with
  `/ss:review`, whose loop records a new verdict line, tell the person in one line why the
  merge waits, and compare again once the front reports.

## Run the merge

Use the method the repository uses: the one its settings allow and its history shows.
Pass its flag, `--squash`, `--merge` or `--rebase`, and pin the head that was checked, the
`head` `patch_id.py` measured:

```bash
gh pr merge PR_NUMBER --squash --match-head-commit HEAD_SHA
```

On a squash, the commit title is the PR title unless `--subject` sets another. Set
`--subject` when the PR title does not carry the commit type the change deserves (the
next section says why that matters).

## Land in dependency order

A front that needs another front's result opens after that front's PR lands. To open it
earlier, tell the person why in one line, such as work that does not touch the code the
other PR changes.

When several PRs are green, merge the one the others depend on first. A PR that builds on
another's code, schema or API waits for that PR, even when its own CI turned green first.

## Merge in sequence

1. Merge one PR, in dependency order.
2. Wait for GitHub to recompute the next PR's mergeable state before merging it.
3. Repeat for the next PR.

Tell the person that PRs merged in sequence are tested together only by `main`'s CI, and
follow that run. After each merge, tell every side session with an open PR in the same
area to merge `main` into its branch, and clean up the merged PR's front by
`references/cleanup.md`.

## Repos that release on every merge

Check whether the repository publishes a release on each merge (semantic-release, a
release workflow on `main`). There, the commit type decides the version: `fix` cuts a
patch, `feat` a minor, a breaking change a major. Make sure the commit title carries the
type the change deserves before merging.
