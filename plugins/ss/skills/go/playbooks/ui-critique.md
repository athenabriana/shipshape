# ui-critique

Judge a screen on real screenshots, a page, an app, a mockup or a folder of UI code, and by default fix it until the design critic is pleased and every goal is met, with an accessibility check in every round.

## Steps

1. Name the target and the goals: what the screen is, what it should let a user do, and whether the person asked for critique only.
2. Run `ui-critique` on it: `/ss:ui-critique`, which asks once for what is open, then runs the design-review loop until the critic is pleased, the goals are achieved and no accessibility finding is open.
3. Report the verdicts, the board of screenshots and what is still open, with what it decided on its own.

## Route

The route never shortens the loop: it runs until both verdicts hold, a cap the person set, or the usage window. It decides what follows the fixes:

| Route       | After the loop                                        |
| ----------- | ----------------------------------------------------- |
| lightweight | the fix commits stay on the branch                    |
| standard    | `/ss:review` in its default loop over the fix commits |
| intensive   | `/ss:review deep` over the fix commits                |

The goals are the design loop's, by `<plugin-root>/references/design-loop.md`, which runs `<plugin-root>/references/goal-loop.md` on an interface: proposed and approved once in the opening sheet, WCAG AA always among them.

## Endpoint

Critique only: the report. Critique and fix: the fixes as local commits on the branch, or the approved canvas on the mockup path. Shipping them is the `ship` playbook, offered at the close.
