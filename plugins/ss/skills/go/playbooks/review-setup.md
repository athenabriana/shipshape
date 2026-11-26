# review-setup

Write or update the repo's `CODE_REVIEW_GUIDE.md`, the rule source `/ss:review` reads.

## Steps

1. Run `review-setup`: `/ss:review-setup` writes the guide when the repo has none and updates it when it has one, every rule validated by the maintainer through the question tool.
2. Check the result: every review rule sits in `CODE_REVIEW_GUIDE.md` at the repo root, and none went into `AGENTS.md` or `CLAUDE.md`.
3. Report the rule counts per level, the IDs added, updated or removed, and that the guide takes effect on the next `/ss:review`.

## Route

None: the guide is a document the maintainer approves rule by rule, not code, so no route is sized.

## Endpoint

The guide written at the repo root, uncommitted, for the maintainer to read. When the person asked for more, it rides the `ship` playbook as its own commit.
