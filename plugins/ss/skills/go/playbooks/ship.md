# ship

Land the current branch: green its checks, commit, and ship it to the destination picked.

## Steps

1. Run `ship`: `/ss:ship` greens the checks, locally or in CI, commits and ships to the destination.
2. On the PR path, once CI is green, `/ss:ship` runs the `/ss:review` loop on the PR's head when no verdict covers it, by `<plugin-root>/references/review-gate.md`, and reports the verdict with the head sha.
3. When it reaches an open PR, offer `babysit` (`/ss:babysit <PR>`) through the question tool. Nothing watches the PR unless the person picks it.

## Route

None: `ship` runs after the route of the playbook that built the change. The one gate it adds is the review gate on the open PR endpoint, by `<plugin-root>/references/review-gate.md`.

On the standard and intensive routes the final goal of the playbook that built the change is the review gate, by `<plugin-root>/references/goal-loop.md`: the PR is not shipped until the gate passes on its head with every goal achieved.

## Endpoint

The destination `ship` asks for once: a pushed feature branch, a push to main where the repo allows it, or an open PR with green CI and a review verdict that covers its head. It merges only when the person says so in its chat.
