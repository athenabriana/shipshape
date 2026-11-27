# The report and the edge cases

Step 5 of `/ss:ui-critique` reads this page for what the report holds, and any step reads
the edge cases table when one of its rows applies.

## The report

By `design-loop.md` "Report", plus the accessibility line:

- **The verdicts** of the last round: `pleased`, `goals_achieved` with each goal's status,
  and `WCAG AA: pass | fail | partial` with the count per priority. How many rounds ran,
  and why the loop stopped.
- **The trend**: open findings per round, by severity, first to last, and each round's
  fix groups.
- **Carried to the build**: the build-only goals and the checks not reachable on a canvas,
  each with its ground.
- **A board of the screenshots**, by `<plugin-root>/references/show-for-review.md`: the
  before next to the after in critique and fix; in critique only, each finding pinned to
  its screenshot.
- **What is still open**: one line per finding with its source and severity, and the
  refusals with their grounds. In critique only, every finding, ranked: Critical and
  High first, each with a concrete fix.
- **The UI references**: the source line, then each reference with why it fits and its
  link. A finding that rests on a reference carries that reference's link beside it, and
  the board shows the reference next to the screen it judges.
- **Decided on my own**, one line each, by `long-run.md`.
- **The loop folder's path**, where the screenshots and the state stay.

## Edge cases

| WHEN                                          | THEN                                                                                                  |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| no tool can render the target                 | say so in one line; the accessibility pass runs on the source; nothing is called a visual check       |
| the target needs a login                      | ask once for the access, as a real blocker; never invent or store credentials                         |
| the request names a branch or a diff          | it is a review: say so and point to `/ss:review`, whose design and a11y fronts run on the diff        |
| asked outside a git repository                | a URL, screenshots or a canvas need no repo; fixes to code are not possible, so it runs critique only |
| the target is someone else's site             | critique only, said in one line                                                                       |
| `Agent` cannot dispatch `ss:ss-design-critic` | the fallback in `design-loop.md` "Dispatch the critic", said in one line                              |
| a fix for one finding breaks another goal     | revert it, refuse the finding with that goal quoted as the ground, and keep going                     |
| the critic contradicts the design source      | the design source wins; refuse the finding with the source quoted                                     |
| a finding comes back after its second fix     | `attack-the-premise` fires, by `<plugin-root>/references/triggers.md`; fix it at its cause            |
| the usage window runs low mid round           | finish the edit in hand, commit or republish, report with the reset time                              |
| the session restarts mid loop                 | read `state.json`; resume each unfinished agent with `SendMessage` to its id; retake missing shots    |
| `Agent` cannot dispatch `ss:ss-a11y-auditor`  | a `general-purpose` subagent opened with the agent file's body, as for the critic, said in one line   |
| a canvas board is not static                  | listed in one line; judged on the closest real visual; never reported as rendered                     |
