# Front: contract, the diff against its acceptance criteria

Available when the acceptance criteria resolve: `WHEN … THEN …` lines under a `Goals` or
an `Acceptance criteria` heading (the `Goals` block `/ss:clarify-goals` writes), in the brief this session was given or in the PR body. The
brief wins when both hold them. It's the one front that can catch a diff where every line
is correct and the wrong thing got built.

The criteria and the repo's project facts are the **rulers** this front measures the diff
against, never targets it reports findings about. Read them; don't review them.

## The three questions

1. **Did it build the agreed thing?** Walk the acceptance criteria. Each `WHEN … THEN …`
   line is an acceptance row: find the code that implements it and the test that pins
   it. A row with no corresponding code **or** no test is a finding: cite the row
   verbatim and say which half is missing.
2. **Did it build only that?** Anything in the diff that no criterion asked for is scope
   drift: name it, and say whether it looks like a necessary dependency of the agreed
   work (fine, mention once) or an unrelated ride-along (a finding: it belongs in its own
   branch).
3. **Does it keep the project facts?** Read the `## Project facts` section of the facts
   file (the plugin-root `references/project-facts.md` says which file). A hunk that
   contradicts one of its lines is a finding: cite the line. With no such section, skip
   this question in silence.

## Finding shape

```
# | criterion or fact cited | file:line (or "missing") | what is missing, extra or reversed | level
```

Level, per the plugin-root `references/finding-levels.md`: a missing happy path is
**Bloqueante**, and so is a contradicted project fact; a missing edge row, a missing test
for a built behavior and scope drift are **Sugestão**. A stylistic divergence from the
criteria's wording is not a finding at all.

Cap: 8.
