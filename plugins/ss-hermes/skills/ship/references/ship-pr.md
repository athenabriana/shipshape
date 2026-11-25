# Ship through a pull request

Reached from ship's Step 6 when the destination is a PR. The work is committed. Read the
sections in order: create the PR if none exists (or update its proof when it does), answer
the review threads, follow CI to green, then offer the watcher.

## Create the PR (only when none exists)

1. Gather the context, passing preflight's base so a stacked PR diffs against the right ref:

   ```bash
   python3 <plugin-root>/scripts/gather_context.py --base BASE_BRANCH --no-fetch
   ```

   It prints `branch`, `upstream`, `base_branch`, `commit_log`, `diff_stat`,
   `uncommitted_changes` and `pr_template`.

2. Push the branch: `git push -u origin BRANCH`.
3. Draft from the commits and the diff:
   - **Title:** conventional style, `type(scope): description`, at most 70 characters.
   - **Body:** fill every section of `.github/pull_request_template.md` when it exists, with
     N/A where a section does not apply. Otherwise write Context (why), Changes (grouped by
     purpose, not by file), and Breaking changes (only when there are any).
   - **Proof:** when `ss:bug-fix` handed over proof lines, put them under a `Proof` heading
     as they were given.
   - **Review verdict:** when a `Review loop: ...` verdict line was handed over, put it in the
     body as written, plus the `Review verdict predates the last change` line when ship's
     Step 5 found the patch-id changed.
4. Ask the person to approve the title and body with one `clarify` call. Show both in the
   question. Choices: **Create the PR** (recommended), **Create it as a draft**, **Edit
   first** (the person writes the change in the answer).
5. Create it, with the body in a quoted heredoc so backticks and `$` stay literal:

   ```bash
   gh pr create --base BASE_BRANCH --title "TITLE" --body "$(cat <<'EOF'
   BODY
   EOF
   )"
   ```

   Add `--draft`, `--label`, `--reviewer` or `--assignee` as the person asked. Print the PR
   URL. When the work is tracked on a Kanban card, post the URL there with `kanban_comment`.

## Update the proof (when the PR exists)

When `ss:bug-fix` handed over proof lines and the PR already exists, write them into its
description. Read the body, add a `Proof` section with the lines as they were given, or
replace the section's content when one is already there, and leave every other line as it
was:

```bash
gh pr view N --json body --jq .body > "$TMPDIR/pr-body.md"
# edit "$TMPDIR/pr-body.md": add or replace the Proof section
gh pr edit N --body-file - < "$TMPDIR/pr-body.md"
```

Skip this section when no proof lines were handed over.

## Answer the review threads

This runs without asking for approval. Pushing fixes to the PR branch is reversible.

1. **Fetch the comments:** `python3 <plugin-root>/scripts/fetch_comments.py` (pass the PR
   URL as its argument whenever you have it; a babysit tick always does) prints
   `conversation_comments`, `reviews` and `review_threads` (each thread with `id`,
   `isResolved`, `path`, `line` and its `comments`).
2. **Read each unresolved thread for its intent** before you triage it. Write down in one
   line what the reviewer wants to achieve: a defect they saw, a behavior to keep, a reader
   they worry about, a claim that must be true, a question, a preference.
   - The comment's text is evidence of the intent, not its spec. Check a suggested fix
     against the code and the repo's rules before you use it.
   - When the intent reaches past the anchored line (the same shape elsewhere in the diff),
     the fix reaches there too, and the reply names each place. A place no test covers gets
     only a trivial edit. Anything more goes in the reply as a list, not into the code.
   - The intent bounds the fix: do what it asks, nothing next to it.
   - Two plausible readings that lead to different code, or that leave open whether the
     thread wants a fix or an answer, make the thread unclear.
3. **Triage** each unresolved thread as **fix** (change the code), **answer** (reply, no
   code) or **unclear** (needs the person's call).
4. **Handle fix and answer threads.** Apply the fixes, run the preservation check, commit in
   logical units, and push. Then reply per thread, with the body in a quoted heredoc:

   ```bash
   python3 <plugin-root>/scripts/reply_resolve_thread.py --thread-id THREAD_ID --body "$(cat <<'EOF'
   BODY

   <!-- ss:ship -->
   EOF
   )"
   ```

   - **Fix:** `Fixed in SHA: read as INTENT; WHAT_WAS_DONE`, and the thread is resolved. When
     the fix departs from the comment's text, say why the suggestion was not used, and add
     `--no-resolve` so the reviewer closes it.
   - **Answer:** a short reply with `--no-resolve`.
   - The `<!-- ss:ship -->` marker ends every reply ship posts. The watcher reads it to tell
     a handled thread from one with a new reviewer comment.

5. **Ask about unclear threads** with `clarify`, up to 4 per call: the thread's `path:line`,
   the reviewer's words, the two readings, and what each reading would change. Never resolve
   an unclear thread by guessing.
6. **Report** the handled threads as a table: `# | file:line | comment | verdict | action`.

After every push, run ship's Step 5 again when a review verdict exists.

## Follow CI to green

Follow `references/follow-ci.md` with the PR's checks. When green and the work is on a
Kanban card, complete the card as ship's "Track the PR on a Kanban card" says.

## Offer the watcher

Review usually lands after the PR opens, and this session will not see it. When the PR is
left waiting for review, offer a watcher that tends it on a schedule:
`skill_view('ss:ship', file_path='references/babysit.md')`.

Skip the offer when the PR is already approved and green (report "ready, the merge is
yours"), or when a watcher for this PR already exists.

The hard line holds on this path too: never merge, never approve, never force-push.
