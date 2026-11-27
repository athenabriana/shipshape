# The report template

Step 7 of `/ss:research` reads this: the report's shape and its two rules.

Write the report to the destination from step 1, replacing any earlier version there whole:

```markdown
# Research: [topic]

## Question

[The topic as asked, and the 2–5 questions the report settles.]

Goals: [n] of [m] achieved (questions answered with verified evidence), [each open one by number with what is missing].

## Fronts

[Fronts used and why. Fronts skipped and why.]

## Findings

### [Question 1]

- [Verified claim], `owner/repo:path/to/file.ts:42` (holds)
- [Verified claim], [source URL]: "[quoted passage]" (holds)
- [Verified claim], [page URL], image `[local path]`: [what it shows] (partial: [what held])

## Comparison

| aspect   | option 1 | option 2 | option 3 |
| -------- | -------- | -------- | -------- |
| [aspect] | ...      | ...      | ...      |

## Recommendation

[Which option fits the caller's context and why, citing the findings.]

## Open

- **Partly held**: [claims rewritten to what the evidence shows]
- **Unverified**: [claims with no verdict, links without an image, pages unseen]
- **Fronts unavailable**: [front and the tool it needed]
- **Left out by the cap**: [repositories, pages, questions]

## Sources

- Repositories: `owner/repo`, cloned to `WORKDIR/repos/OWNER-REPO`
- Pages: [URLs]
- Images: [local folder from the image script]
```

Drop the comparison section when there is only one option. Keep the open section even
when it is short: "Nothing." is a valid entry.
