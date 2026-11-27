# The adversarial verify

Step 5 of `/ss:research` reads this: the verifier prompt and what to do with each verdict.

Findings can be confidently wrong. For each **load-bearing claim** (one that drives the
recommendation or a comparison cell), run an independent verifier that tries to refute it
against its own evidence. One verifier per claim, in parallel, or inline one at a time
with no Agent tool.

**Verifier prompt**:

```
Claim: "[claim]"
Evidence: [file:path:line in WORKDIR/repos/OWNER-REPO | URL and the quoted passage | page URL and local image path]

Open the evidence yourself: read the cited code and the code around it, fetch the page
and find the passage, or open the image with Read. Try to refute the claim.
Report: verdict (holds / partial / refuted), what you actually read or saw, and a
corrected statement when it is wrong. Default to "refuted" when the evidence does not
support the claim.
```

Keep the claims that hold. Rewrite the partial ones to what the evidence shows. Drop the
refuted ones. A claim with no verdict is an open question, never a finding.
