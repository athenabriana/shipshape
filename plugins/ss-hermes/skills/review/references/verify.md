# Verify: pool, group, one independent vote, then rank

Between the finders and the report there is one gate: every candidate is judged by a reader
that did not produce it. A finder passes through everything with a nameable failure scenario;
this pass keeps the report worth reading.

At the tiny-diff depth there are no finder children, so "verify" is a self-check by the
coordinator: re-read each candidate against the file before keeping it, under the same rubric
(`<plugin-root>/roles/verifier.md`).

In the loop, round 1's verdicts come from the judge (`loop.md`, "The judge") instead of the
verifier children below, under the same rubric and addenda. §3 and §4 run the same whoever
judged.

## 1. Pool and group

After the barrier, write every candidate to a JSON file under `$TMPDIR` and run:

```bash
python3 <plugin-root>/skills/review/scripts/group_candidates.py < "$TMPDIR/ss-candidates.json"
```

Input is `{"scope_files": [...], "candidates": [...]}`. Output is the groups, the paths that
matched nothing in scope, and the counts for the stats line. A finder may return a path as
absolute, repo-relative, or with backslashes; the script rewrites each to the scope form, so
one location never splits into several groups.

`scope_files` is the changed-file list in diff scope, and the enumerated file set in surface
scope.

Grouping is not dedup. Every candidate keeps its own verdict: two candidates on one line are
often two issues. Candidates with no line group by `file`.

**The dispatch unit is the file, and at most 4 verifiers go out** (6 on a deep run). One
verifier opens a file once and judges every candidate in it, each still labeled and judged on
its own claim. When the files outnumber the cap, bundle them: files holding a `correctness`
candidate first, then `rules` and `contract`, then the rest.

## 2. The verifier children

One `delegate_task` call with a `tasks` list, one task per file bundle, all with the same
`group` (`review-verifiers`). Each task's `context` is the text of
`<plugin-root>/roles/verifier.md`, then the scope block, then the bundle's candidates labeled
`[0]`, `[1]`, … with their `file:line`, then the addendum below when the front calls for one,
then the execution-lane lines when the bundle holds a `correctness` candidate.

A candidate with no verdict (child failed, index omitted) is **dropped**, never promoted to
PLAUSIBLE on the finder's word. It still gets its own line in the report (§4).

## The addendum: rules, contract, a11y and design

These fronts do not turn on a crash, so their verifier brief carries one extra paragraph. It
replaces the crash question and keeps the three verdicts and the evidence rule.

- **`rules` and `contract`**: check the **citation**. Does the quoted rule or fact appear in
  the named source (`CODE_REVIEW_GUIDE.md`, `AGENTS.md`, the acceptance criteria), does its
  scope reach the changed file, and does the quoted line break it? A citation that does not
  hold is REFUTED, however sensible the rule sounds.
- **`a11y`**: does the cited WCAG criterion cover this element, and does the markup fail it?
  An accessible name further up the tree, a native element that already carries the
  semantics, a focus style in a companion stylesheet all refute it. Recompute contrast from
  the resolved colors.
- **`design`**: open what the finding cites (the token file and line, the component path,
  the documented states) and check that the source says what the finding claims and that the
  diff line deviates from it.

## The execution lane

A `correctness` candidate with a concrete trigger (a command, an input to a named entry point,
one focused test) is decided by running it. Give every verifier whose bundle holds one three
lines:

- `runnable: true` or `false`. It is true unless `AGENTS.md` or the person forbids local runs,
  and false in the external PR mode (the PR head is not checked out).
- `head:` the sha at the head of the diff range.
- `uncommitted_changes:` the probe's value.

The rubric in `roles/verifier.md` says how the run happens (one trigger, in a disposable
worktree, never a suite). The outcomes:

| the candidate       | `runnable` | the run                       | verdict                                      |
| ------------------- | ---------- | ----------------------------- | -------------------------------------------- |
| a concrete trigger  | true       | shows the claimed failure     | CONFIRMED, with the command and its output   |
| a concrete trigger  | true       | runs and does not show it     | REFUTED, with the command and its output     |
| a concrete trigger  | true       | cannot start, or does not end | PLAUSIBLE, marked `not executed`, the reason |
| a concrete trigger  | false      | none                          | PLAUSIBLE, marked `not executed`             |
| no concrete trigger | either     | none                          | the reading verdict                          |

The judge runs nothing. In the loop, when `runnable` is true, send the files holding a
`correctness` candidate to verifier children in the same round and the rest to the judge. A
`correctness` finding the judge returns `not executed` goes to a verifier child for its run
before its verdict stands.

## 3. Sweep (deep runs only)

One more finder child gets the verified list and hunts **only for gaps**: moved or extracted
code that dropped a guard or anchor; second-tier footguns (a default evaluated once, a lock
scope that shrank, a predicate with side effects); setup and teardown asymmetry in tests;
config defaults flipped. Up to 8 new candidates, which then go through verify.

## 4. Dedupe, rank, cap

- **Dedupe by root cause** across fronts: keep the entry with the most concrete failure
  scenario and note the other locations (`[same cause also in: …]`).
- **Rank** in three tiers, combining the level (`<plugin-root>/references/finding-levels.md`)
  and the verdict:
  1. **Bloqueante CONFIRMED**
  2. **Bloqueante PLAUSIBLE**
  3. **Sugestão** at either verdict, quality findings at the bottom
- **Cap** at the depth's report cap. Cuts come off the bottom, never a correctness bug. A
  front that states no cap for its scope (surface-scope a11y and design) wins over the depth
  cap.
- **Nothing vanishes.** Every candidate ends in exactly one place: reported, **refuted** (one
  line each), **no verdict** (one line each with the location and why), or counted under the
  cap. The stats line's `candidates` adds up across the four.
