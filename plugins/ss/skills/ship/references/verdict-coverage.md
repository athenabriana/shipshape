# Check the review verdict still covers the branch

Read by `/ss:ship` at Step 2c, and again on the PR path after every push.

A review verdict covers the change it read, and it carries that change's patch-id: the patch-id of the diff from the merge-base to the head, in the verdict line `/ss:review`'s loop writes (`<plugin-root>/skills/review/references/loop.md`, "The verdict line"). Run `python3 <plugin-root>/scripts/patch_id.py`. It measures the head, reads the verdict line from the open PR's description, and prints `{head, base_branch, base_ref, merge_base, patch_id, pr, recorded, unchanged}`. With no PR yet and a verdict line handed over in this session (a review loop run here), pass that line's patch-id as `--expect <patch-id>`.

- **`recorded: null`**: the branch has no recorded verdict. Ship goes on. On the PR path, `references/ship-pr.md` runs the review loop once CI is green; on the other paths the report says no review loop ran.
- **`unchanged: true`**: the verdict holds, even when the base was merged in since.
- **`unchanged: false`**: the review read code that has changed since. Ship goes on. On the PR path the description carries, right under the verdict line, `Review verdict predates the last change: given at patch-id <recorded>, the branch is now at <patch_id>.`, and on every path the report says it. Reviewing the delta is `/ss:review`'s, and its loop replaces both lines. On the PR path, `references/ship-pr.md` runs that loop once CI is green.

On the PR path, run it again after every push (`references/ship-pr.md`), since each fix ship pushes can change the patch-id: the line is written while the two differ and removed once they are equal.
