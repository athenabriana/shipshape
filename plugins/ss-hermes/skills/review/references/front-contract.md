# Front: contract, the diff against what the project already knows and what was asked

The one front that can catch a diff where every line is correct and the wrong thing got built,
or where a choice the project made on purpose got undone.

## The rulers

- **`AGENTS.md` at the repo root**: its project facts (a choice, a trap, a constraint the code
  does not show). Hermes loads it into every session, so the author was told; a diff that
  reverses one did it anyway or did not notice.
- **Acceptance criteria**, when the caller passed them: the brief of the session this
  branch works, or a criteria list in the PR body. Without either, questions 1 and 2 below
  are skipped in one line.

Read the rulers; never review them. A finding about `AGENTS.md` prose is not this front's.

## The three questions

1. **Did it build what was asked?** Walk the acceptance criteria. For each, find the code
   that implements it and the test that pins it. A criterion with no code **or** no test is a
   finding: quote the criterion and say which half is missing.
2. **Did it build only that?** Anything in the diff no criterion asked for is scope drift:
   name it, and say whether it is a necessary dependency of the asked work (fine, mention
   once) or an unrelated ride-along (a finding: it belongs in its own branch).
3. **Does it keep what the project already knows?** For each `AGENTS.md` fact that governs a
   file this diff touches, hold the hunks against it. A diff that reverses a fact is a finding
   unless the same branch also updates the fact in `AGENTS.md` (`git diff RANGE -- AGENTS.md`).
   Quote the fact and its section.

## Finding shape

```
# | criterion or fact quoted | file:line (or "missing") | what is missing, extra or reversed | level
```

Level (`<plugin-root>/references/finding-levels.md`): a criterion's happy path missing is
**Bloqueante**, and so is a fact reversed without updating `AGENTS.md`. A missing edge or test
for a criterion, and scope drift, are **Sugestão**. A wording difference is not a finding.

Cap: 8.
