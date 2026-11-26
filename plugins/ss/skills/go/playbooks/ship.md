# ship

Land the current branch: green its checks, commit, and ship it to the destination picked.

## Steps

1. Run `ship`: `/ss:ship` greens the checks in CI, commits and ships to the destination.
2. When it reaches an open PR, offer `babysit` (`/ss:babysit <PR>`) through the question tool. Nothing watches the PR unless the person picks it.

## Route

None: `ship` runs after the route of the playbook that built the change, and adds no gate of its own.

## Endpoint

The destination `ship` asks for once: a pushed feature branch, a push to main where the repo allows it, or an open PR. It never merges.
