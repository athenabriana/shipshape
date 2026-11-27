# The gate

Step 8 of `/ss:review` reads this to close the run with one handoff question.

When this session is a work session `/ss:orchestrate` opened, every question of this skill (the fronts question, the items question and this gate) goes through `<plugin-root>/references/front-contract.md` instead of a local dialog.

Per `<plugin-root>/references/handoff-gate.md`, one question with **2–4
options**, after a visual of where the review ended (what was fixed, what is open), by
`<plugin-root>/references/show-for-review.md`. Five states can qualify, so take the first three that apply in this
priority order. Unfinished work on this report outranks the next skill:

1. items still open (after a loop: open or disputed ones) → **"Apply more"** (loops to
   step 5, the manual curation)
2. fronts left unrun → **"Run the fronts that were left out"** (loops to step 3)
3. a11y or design findings that need a rendered page (runtime colors, real focus
   order, live regions, the value the cascade actually resolved) → **"Critique the
   running UI: I run /ss:ui-critique"**
4. guide drift or missing guide reported → **"Generate or update the guide: I run
   /ss:review-setup"**
5. no open PR and everything clean/handled → **"Open the PR: I run /ss:ship"** (not
   offered when this run _came from_ ship's post-landing gate. The branch just landed,
   and offering to land it again is a loop)

Lead with the highest-priority one and suffix its label `(Recommended)`. The states
that didn't fit go in one line of prose above the question, so nothing is hidden;
the user can still ask for them via "Other". Last option is always **"Stop here"**
(what stays saved: the report; how to resume: `/ss:review`).
