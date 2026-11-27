# Ask which fronts run

Step 2 of `/ss:review` reads this after `fronts.md`'s probe, to ask the fronts question (manual flow) and say the depth line.

**In the loop this question is not asked**: every available front runs, `threads` and `ci`
included, at the depth step 1 resolved. Say the fronts and the depth in the line below and
go to step 3.

Step 0 already ran the probe, so read that payload here instead of probing again, and
re-run `preflight.py` only when the tree moved since. Then ask with one `AskUserQuestion` (`multiSelect`),
offering **only the available fronts**, each option saying in one line what that
front will look for and roughly what it costs:

```
question: "I found <N> possible fronts on this branch. Which ones do I review?"
options:
  - "Everything that applies (Recommended)": runs the N available fronts in parallel, standard depth.
  - "Correctness plus Rules": bugs in the diff and deviations from CODE_REVIEW_GUIDE.md.
  - "Only <specific front>": <what it covers>.
  - "Everything, deep review": the same fronts with the whole angle set, the sweep, and agents on Opus; costs a lot more.
  - "None, stop here": nothing runs.
```

Offer the deep option only when the run isn't already deep (the argument or the
phrase settled it at step 1), and say in its line that it's the expensive one; the
user paying for it should know that's what they picked.

Say the depth in one line: which of the two ran and why (`standard` unless it was
asked for), with the numbers the resolution actually produced: how many angles are in the diff's set, how many the tier funds,
which ones were dropped and why, and whether the sweep runs (`markdown: 4 angles in
the set, 3 run, wrapper-boundary dropped, no sweep`). Every number in that line comes
from the resolution that just ran, which is what makes it match the stats line at the
end; on a small diff it's also why no agent shows up.
