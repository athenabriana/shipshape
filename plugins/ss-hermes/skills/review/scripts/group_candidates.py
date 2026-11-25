#!/usr/bin/env python3
"""Canonicalize finder candidate paths and group them by file.

Deterministic half of verify.md step 1: finders return the same file as an
absolute path, a repo-relative one, or with backslashes, and an un-canonicalized
path splits one file into several groups. The verifier dispatch unit is the
file, so a group is one file, and candidates are numbered [0], [1], ... within
it. Reads one JSON object on stdin, writes one on stdout.

Input:
  {"scope_files": ["src/a.ts", ...],
   "candidates": [...]}

A candidate is one of:
  - an object with "file" and "line": {"file": "src/a.ts", "line": 42, ...}
  - an object whose "file" (or "location") holds "file:line":
    {"file": "src/a.ts:42", ...} or {"location": "src/a.ts:42-48", ...}
  - a string in the finder shape "file:line | summary | failure_scenario"

Anything else on an object candidate is carried through untouched. An entry
that is none of these (a number, a list, an object with no path) is rejected:
listed under "rejected" and counted, never dropped silently.

A path matches the scope by trailing path segments. When more than one scope
file matches equally well (a bare `index.ts` with two in scope), the path is
ambiguous: it is not guessed, it goes to "unmatched" with its candidates.

Output:
  {"groups": [{"file": "src/a.ts", "matched": true,
               "candidates": [{..., "file": "src/a.ts", "line": 42,
                               "index": 0, "local_index": 0}]}],
   "unmatched": ["path/not/in/scope.ts", "index.ts"],
   "ambiguous": {"index.ts": ["src/index.ts", "lib/index.ts"]},
   "rejected": [{"position": 3, "reason": "not an object or a string"}],
   "stats": {"received": N, "candidates": C, "groups": G, "rewritten": K,
             "unmatched": U, "ambiguous": A, "rejected": R}}

`received` = `candidates` + `rejected`. `index` is the candidate's position
among the accepted ones; `local_index` restarts at 0 in each file group, and
is the label a verifier sees.

Usage: python group_candidates.py < candidates.json
"""

import json
import re
import sys

# `path:line`, `path:line-end` or `path:line:col`. The path part is non-greedy so a
# Windows drive letter (`C:/x/a.ts:42`) stays in the path.
LOCATION = re.compile(r"^(?P<file>.+?):(?P<line>\d+)(?:[-:]\d+)?$")


def normalize(path):
    """Backslashes to forward, drop a leading ./, collapse repeats."""
    p = str(path or "").strip().replace("\\", "/")
    while p.startswith("./"):
        p = p[2:]
    while "//" in p:
        p = p.replace("//", "/")
    return p.lstrip("/")


def split_location(value):
    """'src/a.ts:42' -> ('src/a.ts', '42'); a bare path -> (path, None)."""
    text = str(value or "").strip()
    m = LOCATION.match(text)
    if m:
        return m.group("file"), m.group("line")
    return text, None


def canonicalize(path, scope):
    """Match by trailing path segments against the scope list.

    Returns (canonical_path, status, matches) where status is "matched",
    "ambiguous" or "unmatched". The score is how many trailing segments agree,
    so `b/a.ts` never matches `lib/aaa.ts`, and a tie between scope files is
    reported, never broken by list order.
    """
    norm = normalize(path)
    if not norm:
        return norm, "unmatched", []
    segments = norm.split("/")
    best_score = 0
    best = []
    for candidate in scope:
        c_segments = candidate.split("/")
        k = min(len(segments), len(c_segments))
        if segments[-k:] != c_segments[-k:]:
            continue
        if k > best_score:
            best_score, best = k, [candidate]
        elif k == best_score:
            best.append(candidate)
    if len(best) == 1:
        return best[0], "matched", best
    if len(best) > 1:
        return norm, "ambiguous", sorted(best)
    return norm, "unmatched", []


def parse_line(value):
    """A line number, or None for a whole-file / cross-file claim."""
    if value is None or value == "":
        return None
    try:
        n = int(str(value).split("-")[0].split(":")[0].strip())
    except (ValueError, TypeError):
        return None
    return n if n > 0 else None


def coerce(raw):
    """One raw entry -> (candidate dict, None) or (None, rejection reason)."""
    if isinstance(raw, str):
        head, _, rest = raw.partition("|")
        path, line = split_location(head)
        if not path:
            return None, "string with no file:line"
        item = {"file": path, "line": line}
        if rest.strip():
            item["text"] = raw.strip()
        return item, None
    if not isinstance(raw, dict):
        return None, "not an object or a string"
    item = dict(raw)
    source = item.get("file") or item.get("location") or item.get("file:line")
    if not source:
        return None, "object with no file"
    path, line = split_location(source)
    item["file"] = path
    if item.get("line") in (None, ""):
        item["line"] = line
    return item, None


def main():
    try:
        payload = json.load(sys.stdin)
    except json.JSONDecodeError as exc:
        json.dump({"error": f"stdin is not valid JSON: {exc}"}, sys.stdout)
        sys.stdout.write("\n")
        return 1
    if not isinstance(payload, dict):
        json.dump({"error": "stdin must be a JSON object"}, sys.stdout)
        sys.stdout.write("\n")
        return 1

    scope = [normalize(f) for f in payload.get("scope_files") or []]
    scope = [f for f in scope if f]
    raw_candidates = payload.get("candidates") or []
    if not isinstance(raw_candidates, list):
        raw_candidates = [raw_candidates]

    groups = {}
    order = []
    unmatched = []
    ambiguous = {}
    rejected = []
    rewritten = 0
    index = 0

    for position, raw in enumerate(raw_candidates):
        item, reason = coerce(raw)
        if item is None:
            rejected.append({"position": position, "reason": reason})
            continue
        original = item["file"]
        canonical, status, matches = canonicalize(original, scope)
        if status == "ambiguous":
            ambiguous[canonical] = matches
        if status != "matched" and canonical and canonical not in unmatched:
            unmatched.append(canonical)
        if canonical != normalize(original):
            rewritten += 1
        item["file"] = canonical
        item["line"] = parse_line(item.get("line"))
        item["index"] = index
        index += 1

        if canonical not in groups:
            groups[canonical] = {
                "file": canonical,
                "matched": status == "matched",
                "candidates": [],
            }
            order.append(canonical)
        group = groups[canonical]
        item["local_index"] = len(group["candidates"])
        group["candidates"].append(item)

    result = {
        "groups": [groups[k] for k in order],
        "unmatched": unmatched,
        "ambiguous": ambiguous,
        "rejected": rejected,
        "stats": {
            "received": len(raw_candidates),
            "candidates": index,
            "groups": len(order),
            "rewritten": rewritten,
            "unmatched": len(unmatched),
            "ambiguous": len(ambiguous),
            "rejected": len(rejected),
        },
    }
    json.dump(result, sys.stdout, ensure_ascii=False, indent=2)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
