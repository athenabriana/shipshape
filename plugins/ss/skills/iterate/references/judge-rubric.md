# Rubric

The bar is a set of criteria applied to an output: a prompt's answers, a generated summary,
a document, a README, a set of error messages. This page says how to make a rubric a judge
applies the same way every round. Read `references/judges.md` first for what every check
shares.

## 1. Write the rubric

- **From the person's words**, when they gave criteria, copied as written and numbered.
  Otherwise propose them in the decision sheet, each with a default the person can edit.
- **One criterion per line, each observable**: "every claim cites a file and line", "under
  300 words", "names the next step in its last sentence". A criterion like "clear" or
  "good" is rewritten into what would show it.
- **A scale per criterion**: pass or fail where it can be, 0 to 3 with each level described
  where it cannot. The bar names the level: "every criterion passes", "no criterion below 2".
- **An example per level** when the scale has more than two, so a fresh judge reads the
  levels the same way every round.

Write it to `tools/rubric.md` and put it in the sheet with the goals.

## 2. Fix the samples

- **A document** is its own sample: the judge grades the whole of it.
- **A prompt or a generator** is graded on a fixed set of inputs under `tools/samples/`,
  with a held-out third the session never reads while it changes the prompt. Each input
  runs at least 3 times when the output varies; a criterion passes only when every run
  passes.
- **Each output kept** in `rounds/r<N>/`, with the input it came from.

## 3. Grade

The judge applies the rubric to every output, criterion by criterion, quoting the passage
each score rests on. A goal is the bar over its criteria and samples: "every criterion
passes on every sample, both sets". A rubric score that rose because a criterion was
softened is not a rise: the rubric is fixed once approved, by `references/judges.md`.

## The goals it checks

- `WHEN the summarizer runs 3 times on each of the 20 sample threads THEN every output passes criteria R1 to R5`.
- `WHEN the onboarding doc is graded THEN no criterion scores below 2`.
