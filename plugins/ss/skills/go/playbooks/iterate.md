# iterate

Improve something that already exists until a measurable bar is met: parity with an old API, a benchmark, a flaky test's pass rate, a bot's conversation behavior, a prompt's output quality, a document against a rubric.

## Steps

1. Run `iterate`: `/ss:iterate` confirms the target, settles the goals and their bars through `/ss:clarify` in one decision sheet, picks the judge, builds the check and its baseline, and runs the goal loop until every bar is met and the judge is pleased.
2. Run `review` on the diff the loop left: `/ss:review` in its default loop, by the route below.
3. Report the baseline against the last measurement per goal, the `Goals:` line and the review verdict line, with what it decided on its own.

## Route

The route never shortens the loop: it runs until every bar is met and the judge is pleased, a cap the person set, or the usage window. Its goals are `/ss:clarify`'s on every route, because a bar is the whole point. The route decides the review of the diff:

| Route       | After the loop                                         |
| ----------- | ------------------------------------------------------ |
| lightweight | `/ss:review` with the correctness front only           |
| standard    | `/ss:review` in its default loop over the diff         |
| intensive   | `/ss:review deep` with its `edges` front over the diff |

A screen goes to the `ui-critique` playbook instead, which runs the same loop with the design judges.

## Endpoint

Asked once in the opening sheet: local commits, a pushed branch, or an open PR. Shipping is the `ship` playbook, offered at the close.
