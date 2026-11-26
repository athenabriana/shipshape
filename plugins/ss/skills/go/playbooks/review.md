# review

Judge a diff, the current branch's or a PR's by number, and act on what holds up.

## Steps

1. Read the ground: the branch and its range against the base, or the PR by number.
2. Run `review` on it: `/ss:review` in its default loop, or `/ss:review deep` on the intensive route, or `/ss:review <PR>` for a PR somebody else opened.
3. Report what `review` found and what it fixed or refused, with the verdict it recorded.

## Route

The route sets the depth only, read from the five facts when the change is yours and not yet sized:

| Route       | Depth                                      |
| ----------- | ------------------------------------------ |
| lightweight | the review loop with the correctness front |
| standard    | `/ss:review`, its default loop             |
| intensive   | `/ss:review deep`, every angle             |

## Endpoint

The review's own result: the fixes stay as local commits on the branch, and a PR somebody else opened gets a comment review. Shipping them is the `ship` playbook, offered at the close.
