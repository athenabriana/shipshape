# Front: contract, the diff against the spec that specified it

Available when a spec matches this branch (resolve per the plugin-root
`references/spec-state.md`: `.ss/<slug>/spec.md`), or when `preflight.py`'s `wiki`
carries a fact. It's the one front that can catch a diff where every line is correct
and the wrong thing got built.

`.ss/` is subtracted from the diff every front reads (`SKILL.md`, step 1), and
this front is where that distinction earns its keep: the spec and the wiki facts are the
**rulers** this front measures the diff against, never targets it reports findings about.
Read them; don't review them.

## The three questions

1. **Did it build the specified thing?** Walk the spec's `## Behavior` map. Each
   `WHEN … THEN …` row is an acceptance row: find the code that implements it and
   the test that pins it. A mapped row with no corresponding code **or** no test
   is a finding: cite the row verbatim and say which half is missing.
2. **Did it build only that?** Anything in the diff that no spec section asked
   for is scope drift: name it, and say whether it looks like a necessary
   dependency of the specified work (fine, mention once) or an unrelated ride-along
   (a finding: it belongs in its own branch).
3. **Does it keep what the repo already knows?** Each entry of `wiki` is a `current`
   fact (plugin-root `references/wiki-state.md`) that governs files this diff touches:
   open it, read its claim, and hold the diff's hunks in `matched` against it. A diff
   that reverses a fact is a finding unless the same branch supersedes it, which shows as
   that fact turning `superseded` in the branch's `.ss/wiki/` (`git diff <range> -- .ss/wiki/`).
   Cite the fact's file and title.

Questions 1 and 2 need the spec; with no spec on the branch, say so and run question 3
alone. Question 3 needs `wiki`; empty, it is skipped in silence.

## Finding shape

```
# | spec line or fact cited | file:line (or "missing") | what is missing, extra or reversed | level
```

Level, per the plugin-root `references/finding-levels.md`: a missing happy path is
**Bloqueante**, and so is a fact reversed with no supersede; a missing mapped edge, a
missing test for a built behavior and scope drift are **Sugestão**. A stylistic divergence
from the spec's wording is not a finding at all.

Cap: 8. When the spec has no `## Behavior` (a small spec that skipped the map), say
so and fall back to questions 2 and 3 rather than inventing acceptance rows.
