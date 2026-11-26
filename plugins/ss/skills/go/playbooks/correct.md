# correct

Encode a correction that landed twice, so the mistake cannot land a third time. The router also offers this playbook when it sees the same correction land twice in one session.

## Steps

1. Name the class: from this session's repeated correction, or from the person, with every occurrence (a commit or a PR thread).
2. Run `correct`: `/ss:correct` branches from the base, picks the highest layer that holds the class, proves it fails on a past occurrence, fixes what it catches today, and opens its own PR.
3. Report the class, the layer and why each higher one does not hold, the proof, and the PR with its CI.

## Route

None: `/ss:correct` carries its own proof, a check that fails on a past occurrence, and its own PR. The new check runs through the mechanical gate like any commit.

## Endpoint

An open PR on a branch of its own, `correct/<slug>`, from the base branch. Invoking the playbook is the authorization for that PR; it never rides on the branch of the run that surfaced the correction.
