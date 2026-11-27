# Ship's scripts and bundled files

Read by `/ss:ship` when a step calls one of these scripts and you need its output shape or who else shares it, or when someone asks for the `/loop` prompt.

## references/loop.md

A drop-in `.claude/loop.md` that makes a bare `/loop` run one `/ss:babysit` tick on the current branch's PR (review comments, failed CI, merge conflicts) while keeping merge a human action. Copy it into the target repo or `~/.claude`.

Shared scripts live at the plugin root (`<plugin-root>/scripts/`).

## <plugin-root>/scripts/preflight.py

The ground for the whole run in one call: `gh_authenticated`, branch, base, `merge_base` and the `diff_range` every reader shares, the `pr` with its `checks` buckets, `code_review_guide` and whether the diff's hunks contain UI. Shared with `/ss:review`, whose fronts probe reads the same payload. Prints JSON.

## <plugin-root>/scripts/resolve_checks.py

Walk the checks authority chain without running anything. Its docstring states the chain, tier by tier, and is the one place that does. Prints `{commands, source, truncated, resolved_count, runnable, policy, notes, unresolved, candidates, git_root}`, where `unresolved` is what it saw and could not resolve, so an empty `commands` is never mistaken for a project with no checks. Shared with `prove-the-fix`, which reads its `runnable`, and `/ss:learn`'s check layer, which reads its `commands`.

## <plugin-root>/scripts/patch_id.py

The patch-id of the branch's own change, the diff from the merge-base to the head, compared with the one the review verdict recorded in the PR description (Step 2c), and each `--resolve` sha placed on the branch by sha or by patch-id (Step 2b). Shared with `/ss:review`, whose loop records the patch-id, and the orchestrator's landing, which compares it with `--pr`. Prints JSON.

## <plugin-root>/scripts/inspect_pr_checks.py

Fetch failing PR checks, pull GitHub Actions logs, and extract a failure snippet. Exits non-zero while failures remain. Shared with `/ss:babysit`, whose ticks read it, and `/ss:review`, whose `ci` front reads it instead of re-specifying `gh`.

## <plugin-root>/scripts/gather_context.py

Collect branch, upstream, base + merge-base, commit log, diff stat, changed files, full diff, uncommitted changes, and PR template in one call. Shared with `/ss:investigate`. Prints JSON.

## <plugin-root>/scripts/fetch_comments.py

Fetch all PR conversation comments, reviews, and review threads (with thread IDs and resolved state) via `gh api graphql`. Takes the PR URL or number as its argument, so it reads a PR whose branch is not checked out. Shared with `/ss:babysit` and `/ss:review`. Prints JSON.

## <plugin-root>/scripts/reply_resolve_thread.py

Reply to a review thread and/or resolve it. `--thread-id` from fetch_comments.py; `--body` for the reply; `--no-resolve` to reply without resolving. Shared with `/ss:babysit` and `/ss:review`.
