# learn

Take one lesson (a correction, a rule, a fact) and send it to the strongest layer that holds it: a check, else a review rule, else a project fact. The router also offers this playbook when it sees the same correction land twice in one session.

## Steps

1. State the lesson in one line, with where it came from: the corrections and their commits or PR threads, or the person's own words quoted.
2. Pick the layer, the first that holds the lesson:
   - **A check**, through `/ss:correct`: a type, a lint, a test or a CI check can catch the mistake on a past occurrence.
   - **A review rule**, through `/ss:review-setup`: no check can hold it, and it says what a review should reject in a diff. It lands in `CODE_REVIEW_GUIDE.md`.
   - **A project fact**, through `/ss:record-fact`: it is a choice, a trap or a constraint the code cannot show, and it passes the filter in `<plugin-root>/references/project-facts.md`.

   For each layer above the pick, write why it does not hold. A lesson that passes none is declined, with the test it failed, and the run stops.

3. Show where it would land, by `<plugin-root>/references/show-for-review.md`: the three layers with the pick marked first, and the landing spot as a before and after (the check and the file it lives in, the guide's rule under its section, or the `## Project facts` line).
4. Ask once through the question tool: the recommended layer first, each other layer that could hold the lesson with what it costs, and **Stop here**. In a work session the question and the visual's link go to the orchestrator by `<plugin-root>/references/front-contract.md`.
5. Run the picked skill on the lesson: `correct`, `review-setup` in update mode, or `record-fact`. Each keeps its own steps and its own approval (the proof, the rule's validation, the exact line).
6. Report the lesson, the layer and why each higher one does not hold, and what the picked skill left: its PR with CI, the guide's rule ID, or the line written.

## Route

None: the playbook only picks the layer. The picked skill carries its own proof and its own approval, and a check runs through the mechanical gate like any commit.

## Endpoint

The endpoint of the picked skill's playbook: an open PR on `correct/<slug>` from the base branch for a check, the guide written at the repo root and uncommitted for a review rule, and the line written in the facts file, uncommitted, for a project fact. A check never rides on the branch of the run that surfaced the lesson.
