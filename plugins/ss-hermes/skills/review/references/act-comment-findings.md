# Action: leave the findings on the PR

For items the person chose to **comment instead of fix**. Available only when the probe found
an open PR. With no PR the items stay in the report and the gate recommends `/ss:ship`.

## 1. Show the body, then post

A PR comment is outward-facing and carries the person's identity. Print the exact body of
every comment, then ask through `clarify` ("Post these N comments?", choices "Post them
(Recommended)" and "Keep them in the report"). Post only on yes.

After a loop, the items here are the ones it left open or disputed, and the summary comment
may open with `Review loop: N rounds, verdict VERDICT.`, with no reviewer or model named.

## 2. Two tests decide inline or summary, in this order

**First the concrete-cost gate** (`<plugin-root>/references/finding-levels.md`):

- A **Bloqueante** skips the gate and goes to the anchor test.
- A **Sugestão that names a concrete cost** goes to the anchor test. The cost is what
  `front-quality.md` asks for in `custo concreto`: what is duplicated and where the other
  copy is, what work is wasted per call, what a future editor has to keep in sync.
- A **Sugestão that names none** folds into **one aggregated line** in the summary comment,
  with the count ("4 sugestões sem custo concreto, no relatório"). Its report line is
  untouched, and the re-report records it as `agregado`.

**Then the anchor test**:

- **Location inside the diff**: one review comment per item, anchored to the line through
  `gh api repos/OWNER/REPO/pulls/N/comments` with `path`, `line` and `commit_id` (the head
  sha).
- **Location outside the diff** (an untouched line of a touched function, a whole-file
  claim): no anchor exists, so it goes in the summary comment with `file:line` in the text.
- **Items about the change as a whole** (a contract gap, the rules checklist): summary
  comment, `gh pr comment N --body-file -`.

## 3. Additive: the whole conversation is the corpus

Match against everything already said on the PR, whoever said it: the `fetch_comments.py`
payload from the intent read. A point another reviewer made counts as much as one ss made.
Match by `file:line` plus substance:

- **already said**: post nothing. The item keeps `[já dito: LINK]` in the report and the
  re-report records `já dito (LINK)`.
- **partly said**: one comment with only the new part, opening with the note it builds on and
  its author ("@AUTHOR already asked for the guard on `parse()`; what is still missing is the
  empty-list case").
- **not said yet**: post in full (§4).
- **already said and now fixed**: out of the body; it survives as a count in the opening line
  ("2 of the 3 earlier points resolved").

`fetch_comments.py` carries no per-note URL. Take links from `gh pr view N --json comments`
(`url`) and `gh api repos/OWNER/REPO/pulls/N/comments` (`html_url`). Where a note has none,
the mark carries its author and `file:line`.

**When every picked item was already said, post nothing.** Say it in one line with the count
("6 items, all 6 already in the conversation, nothing posted").

## 4. Keep the shape the report gave it

Each comment carries what the item had: rule ID and quoted rule, WCAG criterion, trigger,
suggested fix, **and its verdict**. A PLAUSIBLE posted as if it were CONFIRMED is how the next
comment stops being read. Collect each comment's URL for the re-report (`comentado (LINK)`).
