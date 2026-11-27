# Review context: what step 0 loads

Step 0 of `/ss:review` reads this before any front runs.

- **Finding levels:** every finding this review writes is a **Bloqueante** or a
  **Sugestão**, defined once in `<plugin-root>/references/finding-levels.md`: what each
  one means, which name goes on which surface (a guide states the same two as `HIGH` and
  `LOW`), where each front lands, the concrete-cost gate, and how a rule still
  ranked `MEDIUM` collapses. The fronts, the verify pass and the comments all read it.
- **Repo guide:** if `CODE_REVIEW_GUIDE.md` exists at the repo root, read it fresh
  (never cached): it's the `rules` front's whole rule source, and its levels
  rank the whole report. No guide → the front is unavailable and the report carries
  one line, "No CODE_REVIEW_GUIDE.md: the repo's own rules come from
  /ss:review-setup". Why the guide alone is the source: `references/front-rules.md`.
- **Legacy custom skill:** if `.claude/skills/code-review/SKILL.md` exists (an old
  generated per-repo review skill), note in the report that `/ss:review` +
  `CODE_REVIEW_GUIDE.md` supersede it and the user can delete it.
- **The intent read** → `references/intent-read.md`: run the probe, read the PR body and the
  whole conversation, and write the **intent block** that rides in every finder's scope block.
  It runs before any finder, and an external PR skips it.
