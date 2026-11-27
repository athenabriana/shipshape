# learn

Keep a lesson (a correction that landed twice, a rule, a fact) at the strongest layer that holds it: a check, else a review rule, else a project fact. The router also offers this playbook when it sees the same correction land twice in one session.

## Steps

1. Run `learn`: `/ss:learn` states the lesson, picks the layer, shows where it would land, asks once, and runs the picked layer.

## Route

None: the playbook only picks the layer. The layer carries its own proof and its own approval, and a check runs through the mechanical gate like any commit.

## Endpoint

The picked layer's: an open PR on `correct/<slug>` from the base branch for a check, the guide written at the repo root and uncommitted for a review rule, and the line written in the facts file, uncommitted, for a project fact. A check never rides on the branch of the run that surfaced the lesson.
