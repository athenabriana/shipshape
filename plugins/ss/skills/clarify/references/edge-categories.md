# Edge categories: the walk behind the behavior map

Step 3 of clarify maps the behavior: the happy path, then every edge that changes the
outcome for the user. This page is the walk for the edges. `/ss:review`'s `edges` front
walks the same table over a diff (`skills/review/references/front-edges.md`).

## The categories

Walk each one. Keep only those the behavior can reach, and say in one line which you
dropped.

| category                | look for                                                             |
| ----------------------- | -------------------------------------------------------------------- |
| cardinality             | empty, zero, one, many                                               |
| boundaries              | min and max, off-by-one, inclusive vs exclusive, negative            |
| bad input               | null, missing field, wrong type, malformed, whitespace only          |
| duplicates and ordering | the same item twice, unsorted input, stable order expected           |
| concurrency             | two writers, retries, double submit, idempotency, lost update        |
| time                    | timezones, DST, clock skew, expiry, leap days, end of month          |
| i18n                    | unicode, emoji, RTL, combining marks, locale formats, case folding   |
| auth and tenancy        | no permission, expired session, another tenant's id, role change     |
| partial failure         | timeout, network drop, half-written state, dependency down, rollback |
| scale                   | large input, size limits, pagination edges, rate limits              |
| state transitions       | invalid transition, re-entry, cancel mid-flow, repeat after success  |
| compatibility           | old data, missing migration, old client, renamed or removed field    |

## The walk

1. **Read what the code already does at each edge.** A constraint the database enforces is
   an outcome you do not have to invent.
2. **Write one row per case**, `WHEN <case> THEN <observable outcome>`, phrased so it reads
   as a test. Map the outcome, not only that the case exists.
3. **Mark the load-bearing rows**: those whose wrong outcome would betray the reason the
   behavior exists. They come first and become candidate goals in step 4, each with its
   check.
4. **A row with no known outcome is a question for the person.** It joins the one ask of
   step 5 with a recommended outcome, never a guess.
5. **A row that taught something the code does not show** (a constraint, a trap) is
   offered to `/ss:learn` as a project fact, and kept only on a yes.
