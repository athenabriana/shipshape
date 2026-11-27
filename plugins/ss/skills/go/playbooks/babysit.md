# babysit

Watch one PR by number until it is merged, closed, or approved with CI green.

## Steps

1. Run `babysit`: `/ss:babysit <PR number or URL>` finds the watcher this PR already has, or makes one.
2. Report the watcher, how often it runs, and when it stops.

## Route

None: a watcher changes no code by itself; each fix it makes on a red run goes through the preservation check and the mechanical gate like any commit.

## Endpoint

None: the watcher stops on its own when the PR is merged, closed, or approved with CI green. Its last report calls the PR ready to merge only when the review gate of `<plugin-root>/references/review-gate.md` passes too. Its runs merge nothing: the word to merge is given in a chat, and a run has none.
