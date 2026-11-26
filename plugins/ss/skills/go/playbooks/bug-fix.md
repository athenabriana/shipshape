# bug-fix

Take a bug from a short report (a pasted error, a stack trace, "fix this bug") to a proven fix, with no spec.

## Steps

1. Read the ground: run `<plugin-root>/scripts/preflight.py` (branch, `base_branch`, `pr`, `gh_authenticated`) and `<plugin-root>/scripts/resolve_checks.py` (`commands`, `runnable`, `policy`) once, and read the CI triggers in `.github/workflows/`. On a protected branch, create `fix/SLUG` before the first edit; on any other branch, stay on it.
2. Settle the endpoint once: local commit, pushed branch or open PR. A phrase in the request ("and ship", "open the PR", "abre o PR") is the answer; say in one line which endpoint you read.
3. Find the cause with `investigate`: read the error, the code it names and `git log -p --follow -n 5 -- FILE`, then state one hypothesis in one line. Test competing hypotheses in parallel with one read only `Agent` subagent each. Stop as soon as the reproduction confirms the cause. After three refuted hypotheses, stop, report each attempt, and fix nothing.
4. Reproduce the failure with `prove-the-fix`: the smallest script or test, kept in the session's scratchpad, watched failing the way the report says. When it cannot be reproduced, stop and report what ran and the hypotheses still standing.
5. Size the route with `<plugin-root>/scripts/route.py` from the five facts of the planned fix, and say the route and its reason in one line.
6. Write the focused test that fails because of the bug, held to "The focused test" in `prove-the-fix`.
7. Make the smallest fix that removes the cause, and show both halves of the proof as `prove-the-fix` gives them for `runnable`. A refactor or a neighboring bug goes in the report as a follow-up. When CI stays red on the focused test after the fix, go back to step 3 inside the three-hypothesis limit.
8. Stop and hand to `/ss:shape` when the fix grows past a small change (several modules, a public contract, a design decision) or depends on a business rule nobody decided: edit nothing more, and pass on the cause, the rule and the reproduction.
9. Run the mechanical gate: the preservation check on the staged diff, commit the test as `test(SCOPE): ...` and the fix as `fix(SCOPE): ...` (pre-commit hooks run), then push and follow CI when the endpoint allows a push.
10. Review per route with `review`, run as a playbook step: its verdict line comes back to this run.
11. Ship per endpoint with `ship`, handing it the proof lines and the review verdict for the PR body. Report the cause, the fix, the route, the proof and the follow-ups, each in one line.

Two situational skills fire by trigger (`<plugin-root>/references/triggers.md`): `attack-the-premise` when a second fix fails the same gate as the first, and `explain-the-number` when the bug is that something got slow, where a benchmark is the reproduction and its verdict is the proof.

## Route

| Route       | What runs                                                                             |
| ----------- | ------------------------------------------------------------------------------------- |
| lightweight | preservation check, mechanical gate, the review loop with only the correctness front  |
| standard    | mechanical gate, `/ss:review` in its default loop                                     |
| intensive   | a blast radius pass first, `edge-cases` on the diff, `/ss:review deep` with its table |

Every route then runs `ship`. The blast radius pass, before the fix, writes one line per caller of the changed code: does the fix keep it correct. A caller the fix would break widens the fix, and step 8 decides.

## Endpoint

Local commit, pushed branch or open PR, asked once through the question tool when the request leaves it open. At a local commit the run ends with the fix committed and the test-fails-first half shown locally, or the report says it was not shown. A performance fix whose verdict is `no measurable difference` or `inconclusive` is not proven, so it never chains into review or ship.
