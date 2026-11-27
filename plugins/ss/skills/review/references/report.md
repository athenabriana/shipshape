# The report

Step 4 of `/ss:review` reads this to write the unified report, in the loop and in the manual flow.

One unified report, numbered items across all fronts, in the three tiers `verify.md`
§4 ranked. Each item carries its front, its **level** (**Bloqueante** or **Sugestão**, the
only two the report speaks), its verdict, and the columns of **its own front's Finding
shape**. An a11y or design item shows its own priority in its own columns and the
level it maps to. The row format lives in each `front-*.md` next to the method that
produces it, so a front that changes its columns doesn't leave a stale template
here. Group the items by front under the front's label from the catalog's Label
column (Correctness, Edge cases, Quality, Project rules, Contract, Accessibility,
Design system, PR threads, CI) and keep one numbering across the whole
report.

**What the conversation already covers is marked, never dropped.** Read the report
against the intent block: an item whose point a note in the conversation already made
ends its line with `[já dito: <link>]`, and carries the author when that note has no
link of its own. The item keeps its number, its level, its verdict and its columns,
because the mark governs what reaches GitHub and not what the user reads. Step 7 is
where the mark acts (`references/act-comment-findings.md` §3): a marked item posts
nothing, one only partly covered posts only its new part.

Close with what didn't make it and what actually ran:

- **what came back clean**: one line per front naming what it covered and found
  nothing on, with the count the depth resolution actually produced ("Correctness:
  3 of the set's 4 angles, nothing outside items 1–3"). The `rules` front
  closes with its own PASS/FAIL/SKIP checklist per rule (`front-rules.md`), which is
  what makes a silent rule readable as checked instead of forgotten;
- refuted candidates, one line each;
- candidates left **with no verdict** (dropped: a verifier died or skipped the
  index), one line each with the location;
- the count cut by the cap ("+4 quality items over the cap");
- **what the conversation suppresses from GitHub**: how many reported items are marked
  `[já dito]` and therefore post nothing, and how many are left to post ("9 items, 3
  já ditos, 6 postable"). Every item was reported; the line is what makes a short
  posted review over a long report read as additive instead of as a review that lost
  items. All of them marked is still a line, and it says nothing will be posted;
- one stats line: fronts run, finder agents, candidates, verified, refuted, left
  with no verdict, reported. It's how the reader knows the depth that ran matches
  the depth that was announced, and the candidate count has to add up.

Clean everywhere → say so and jump to the gate (step 8).
