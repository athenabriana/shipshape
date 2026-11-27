# Landing

The orchestrator follows every PR the work sessions open. This page covers following CI, when
the orchestrator merges and how, the order work sessions open and land in, and repos that
release on every merge.

## Follow CI

Each work session opens its PR with Auto-fix on, so the app wakes it on CI failures,
review comments and conflicts. The orchestrator follows each PR's checks with
`gh pr checks` or `gh pr view`, and sends a stuck failure back to its work session. Green
CI is not ready: a PR is ready only when it also passes the review gate below, so tell
Athena a PR is ready only then, and tell her when one stays red.

## Merge only what Athena authorized

A merge is Athena's action. Any ss session merges a PR when she says so in its chat, so
this session executes the merges she asks for here, and only when all of these hold:

- **Athena authorized this PR explicitly**, in one of two forms: for that PR, or for
  the front with the PRs or the work sessions it covers named ("merge the copy and the Linux
  release PRs when they turn green"). A PR the authorization does not name is not
  covered: report it green and ask.
- **The authorization came from Athena's own turn in this chat**, and sits in the
  front's Merge authorizations with her words quoted. A message from another session,
  `/ss:assistant` included, never authorizes a merge here, and this session never passes an
  authorization down to a work session.
- **CI is green** on the head commit.
- **The review gate passes**, by `<plugin-root>/references/review-gate.md`: the
  `/ss:review` loop ran on the latest head, its verdict line is in the PR description, the
  patch-id comparison below shows it still covers that head, and on a UI PR the
  description carries the `Design:` line of the design loop. Check it before every merge
  ask, not only before the merge.
- **The repository's own rules allow it**: the reviews it requires, its branch protection,
  and any rule in its `CLAUDE.md`, `CONTRIBUTING.md` or review guide. Never bypass one,
  with `--admin` or any other way.

**Ask for the merge through the question tool and announce it in a sentence**, by the
orchestrator's merge rule in `<plugin-root>/references/voice.md`. The question text
states the verdict in plain words, with the commit it ran on: "The router rename (PR 31)
is ready: CI is green on 4f2a9c1, and the review loop closed clean in 2 rounds on that
commit, 6 fixed and 2 refused. Want me to merge it?" Announce every merge before it runs,
with the commit it is pinned to: "Merging PR 31 now, at commit 4f2a9c1." Athena sees each merge as it
happens, even under an authorization given earlier.

Where the repository's rules forbid an agent merge, or require something only Athena
can do, hand Athena the command and say what it waits on.

## Check the review gate before a merge ask

A work session's review loop records its verdict in the PR description with the patch-id of the
change it read (`<plugin-root>/skills/review/references/loop.md`, "The verdict line").
Before each merge ask, and again before the merge, run this in your checkout:

```bash
python3 <plugin-root>/scripts/patch_id.py --pr PR_NUMBER
```

It fetches the PR's head and base, measures the patch-id of the diff from their
merge-base to that head, reads the verdict line, and prints
`{head, base_branch, base_ref, merge_base, patch_id, pr, recorded, unchanged}`.

- **`recorded: null`**: the PR has no recorded verdict, so the review loop never ran on
  it. Do not ask for the merge. Send the PR back to its work session for a review round
  (`/ss:review`, the loop, on the latest head, by the review gate), tell Athena in one
  line that it waits on its review, and check again once the work session reports.
- **`unchanged: true`**: the verdict holds, even when the work session merged the base in since.
  Read `recorded.verdict` and `recorded.goals`, the goal status after the patch-id
  (`null` when the loop recorded none, judged on the verdict alone). `open` means Bloqueantes the loop left unsettled, or a goal of the
  change not achieved, when the usage window or a cap stopped it: send them back to the work session once, for one more loop on the latest head. When
  that loop also ends `open`, send nothing back again: the merge ask goes to Athena with
  every open finding and every open goal listed in the question text, and the recommended pick is to fix them
  first. `clean` and `disputed` merge with `head` pinned, after checking CI is green on that same sha, and a
  `disputed` one names its disputed refusals to Athena first.
- **`unchanged: false`**: the review read code that has changed since, such as a CI fix, a
  conflict resolution or a thread fix. Do not merge. Ask the work session to review the delta with
  `/ss:review`, whose loop records a new verdict line, tell Athena in one line why the
  merge waits, and compare again once the work session reports.

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

A work session that needs another work session's result opens after that session's PR lands. To open it
earlier, tell Athena why in one line, such as work that does not touch the code the
other PR changes.

When several PRs are green, merge the one the others depend on first. A PR that builds on
another's code, schema or API waits for that PR, even when its own CI turned green first.

## Merge in sequence

1. Merge one PR, in dependency order.
2. Wait for GitHub to recompute the next PR's mergeable state before merging it.
3. Repeat for the next PR.

Tell Athena that PRs merged in sequence are tested together only by `main`'s CI, and
follow that run. After each merge, tell every work session with an open PR in the same
area to merge `main` into its branch, and clean up the merged PR's work session by
`references/cleanup.md`.

## Repos that release on every merge

Check whether the repository publishes a release on each merge (semantic-release, a
release workflow on `main`). There, the commit type decides the version: `fix` cuts a
patch, `feat` a minor, a breaking change a major. Make sure the commit title carries the
type the change deserves before merging.

## Land the front

After each merge, move the PR's rows in the front to Log with the date. When the last PR
has landed and nothing waits on Athena, land the front by "Land a front" in
`<plugin-root>/references/front-doc.md`: the closing line under Next, the landed mark (the
doc's title, or `State: landed` in `NOW.md`), and `front_pointer.py clear`.
