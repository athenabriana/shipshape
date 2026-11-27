# Bundled resources

`/ss:review` reads this to find a script, an agent or a reference by what it holds, at any step.

Router support:

- `references/intent-read.md`: step 0's probe, the PR body and conversation reads, and the intent block every finder carries.
- `references/fronts.md`: the front catalog, the availability probe, the depth table and the fan-out shape.
- `references/verify.md`: pool, group by file, 3-state verdict, sweep, rank and cap.
- `references/loop.md`: the review loop, the change's goals, its scoped rounds and full pass, the judge and its fallback, the stop, the owner's fix or refuse, and the record.
- `<plugin-root>/references/goal-loop.md`: the shared goal loop this loop specializes.

Per-front method (loaded only when that front is picked):

- `references/front-correctness.md`: the correctness angles over the diff, and how the diff's content picks which of them run.
- `references/front-edges.md`: the inputs the diff does not handle, category by category, on deep runs or when named.
- `references/front-quality.md`: the cleanup lenses, one finder, behavior-preserving.
- `references/front-rules.md`: `CODE_REVIEW_GUIDE.md` deviations, with the citation discipline, and the project facts growth check.
- `references/front-contract.md`: the acceptance criteria from the brief or the PR body as the contract, and the project facts.
- `references/front-a11y.md`: WCAG AA over the diff, static; its criteria are also `/ss:ui-critique`'s accessibility pass.
- `references/front-design.md`: design-system deviations and the critic pass over screenshots: the source ladder, the citation discipline; its criteria are also `/ss:ui-critique`'s design system pass.
- `references/front-threads.md`: PR review threads: fetch, triage, the resolve pass over what the code already satisfies, fix/answer, reply/resolve.
- `references/front-ci.md`: CI failures: evidence → diagnosis → fix → verify.

Skill-owned script:

- `scripts/group_candidates.py`: canonicalizes finder paths against the scope file list and groups candidates by file for the verify pass, with `ambiguous` and `rejected` entries listed. Reads/writes JSON.

Actions and modes:

- `references/act-apply-fixes.md`: applying findings: the regression guard and the order of operations.
- `references/act-comment-findings.md`: leaving findings on the PR instead of fixing: anchoring and approval.
- `references/mode-external-pr.md`: reviewing a PR in another repo and posting the review, a comment or a request for changes, never an approval.

Pipeline agents (plugin root, dispatched by the fan-out):

- `<plugin-root>/agents/ss-review-finder.md`: the finder's contract, and the narrowed `tools:` list.
- `<plugin-root>/agents/ss-review-verifier.md`: the CONFIRMED / PLAUSIBLE / REFUTED rubric.
- `<plugin-root>/agents/ss-review-judge.md`: the loop's judge on Sonnet, round 1 verdicts and the later rounds' closed/open, accepted/contested and new findings, one JSON object.
- `<plugin-root>/agents/ss-design-critic.md`: the design front's critic, very hard to please, over screenshots of the running UI; findings with a severity, and two verdicts (pleased, goals achieved), one JSON object. Its loop is `<plugin-root>/references/design-loop.md`.

- `references/review-checklist.md`, `references/quality-checklist.md`, `references/design-checklist.md`: the correctness, quality and design criteria the fronts operationalize.

References (plugin root):

- `<plugin-root>/references/finding-levels.md`: Bloqueante / Sugestão (`HIGH` / `LOW` in a guide), the per-front mapping, the concrete-cost gate and the legacy collapse. Shared with `/ss:review-setup`.

Scripts (plugin root):

- `<plugin-root>/scripts/preflight.py`: the whole availability probe in one call, run at step 0. Resolves the review's diff range, answers every front's "Available when" (`fronts.md`), and its `pr` is what decides whether the intent read has a conversation to read.
- `<plugin-root>/scripts/gather_context.py`: the same branch context plus the commit log, the full diff and `pr_body`, the PR description the intent read works from, for a scope paragraph the probe's diff stat cannot carry. Called with `--base <the probe's base_branch> --no-fetch`, because the probe resolved that base against the PR's own and already paid the fetch: without both flags this second call re-derives the base from the repo default and diffs a stacked PR against the wrong ref.
- `<plugin-root>/scripts/inspect_pr_checks.py`: failing checks, their run IDs and the failure snippets, for the `ci` front (`front-ci.md`).
- `<plugin-root>/scripts/fetch_comments.py`, `<plugin-root>/scripts/reply_resolve_thread.py`: thread I/O via `gh api graphql`. `fetch_comments.py` is also the conversation half of step 0's intent read: the comments, the review bodies and the inline threads in one payload.
