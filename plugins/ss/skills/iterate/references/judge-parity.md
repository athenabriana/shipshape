# Parity harness

A new system must behave like an old one: a rewritten API, a migrated service, a CLI ported
to another language, a parser replaced. The bar is "the same input gives the same output on
both sides, or the difference is approved". This page says how to build a harness that
proves it. Read `references/judges.md` first for what every check shares.

## 1. Inventory the surface

List everything the old side answers, before writing a single call:

- **Routes or commands**, from the old system's router, OpenAPI file, CLI help or access
  logs: method, path, and the parameters each takes.
- **Per route, the cases**: the happy path, each documented error, auth on and off, empty
  and paged results, the edge values of each parameter (by
  `<plugin-root>/skills/clarify/references/edge-categories.md`).
- **What is out of scope**, named with the person in the decision sheet: a route being
  retired, an admin endpoint nobody calls.

Write the inventory to `tools/parity/inventory.json`. The parity goals count against it:
"WHEN every case in the inventory replays THEN every response matches", never "the ones I
tried".

## 2. Record the calls

Each case becomes a recorded call: the request exactly as sent (method, path, query,
headers that matter, body) and the old side's response (status, headers that matter, body).

- **From real traffic** when the person can give logs or a capture, scrubbed of secrets and
  personal data before they reach the loop folder.
- **Written by hand** from the inventory otherwise, one file per case under
  `tools/parity/calls/`.
- **Against a fixed state**: the same seed data on both sides, the same clock, the same
  feature flags. A call that writes runs against a fresh copy of the state on each side.
- **Credentials** come from the environment or the person's secret store, never written into
  a call file, the loop folder or a commit.

## 3. Replay on both sides and normalize

The harness sends each recorded call to the old side and to the new side, live, in the same
round, and keeps both responses raw in `rounds/r<N>/`. Then it normalizes both before the
diff, with rules written once and approved with the goals:

- **Volatile fields**: ids, timestamps, request ids, ETags, ordering of a set the contract
  says is unordered. Each one replaced by a placeholder or sorted, by a rule that names the
  field.
- **Encoding**: key order in JSON, whitespace, number formatting, header case.
- **Nothing else.** A normalization rule that hides a value the contract promises is a
  difference in disguise: it goes to step 4 instead.

## 4. Diff, and approve the differences

The harness prints one line per call (`match`, `differs`, `error on new`, `error on old`)
and a structural diff for each `differs`. Each difference ends one of two ways:

- **Fixed** on the new side, and the call matches next round.
- **Approved**: the new behavior is the intended one (a bug the old side had, a field
  renamed on purpose). An approved difference is written to `tools/parity/approved.json`
  with the call, the exact diff, the reason and who approved it. The person approves each
  one, in the opening sheet or as a real blocker mid-loop; the session never approves one
  alone.

The judge gets `approved.json` every round and treats a difference that is not in it, or
differs from the approved diff, as not matching.

## The goals it checks

- `WHEN every call in the inventory replays THEN each one matches or its difference is approved`: the count, per route.
- `WHEN a call errors on the old side THEN the new side returns the same status and error shape`.
- Any non-functional bar the person adds (latency no worse than the old side) is a
  benchmark goal beside it, by `references/judge-benchmark.md`.
