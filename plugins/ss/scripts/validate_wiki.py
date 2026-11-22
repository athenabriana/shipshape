#!/usr/bin/env python3
"""
Validate the `.ss/wiki/` bundle against `plugins/ss/references/wiki-state.md`.

Prints JSON `{wiki, errors, warnings, orphans, repeated_corrections}` and exits 1 on any
error. A fact whose `paths` match no tracked file is a warning listed in `orphans`, never an
error: the build's wiki pass resolves it by following the rename or superseding the fact.
`repeated_corrections` lists the `current` correction facts with two sources or more, the
classes `/ss:correct` is due for. It is information, never an error.

Usage:
  python3 validate_wiki.py [--wiki .ss/wiki] [--no-orphans]
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from build_wiki import (  # noqa: E402
    KINDS,
    LINK,
    RESERVED,
    STATUSES,
    fact_matches,
    load,
    parse_value,
    split_frontmatter,
    strip_backlinks,
    wiki_dir,
)

FACT_KEYS = ("type", "title", "description", "paths", "sources", "status", "created", "updated")
FREE_TEXT = ("title", "description", "correction")
SOURCE_PREFIXES = ("spec:", "pr:", "commit:")
# Each source of a correction fact is one occurrence, so a `spec:` source would be counted
# as one and fire `/ss:correct` on the first.
OCCURRENCE_PREFIXES = ("pr:", "commit:")
REPEATED_AT = 2


def tracked_files(wiki: Path) -> list[str] | None:
    root = subprocess.run(
        ["git", "rev-parse", "--show-toplevel"], cwd=wiki, capture_output=True, text=True, encoding="utf-8"
    )
    if root.returncode != 0:
        return None
    # From the root: run inside the bundle, `ls-files` lists only the bundle itself, and
    # `paths` are relative to the git root anyway.
    p = subprocess.run(
        ["git", "-c", "core.quotePath=false", "ls-files"],
        cwd=root.stdout.strip(),
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    return p.stdout.splitlines() if p.returncode == 0 else None


def check_fact(doc: dict, docs: dict, errors: list) -> None:
    meta, key = doc["meta"], doc["key"]
    for k in FACT_KEYS:
        if k not in meta or meta[k] in ("", None):
            errors.append(f"{key}: missing `{k}`")
    status = meta.get("status")
    if status and status not in STATUSES:
        errors.append(f"{key}: unknown status `{status}`")
    for k in ("paths", "sources"):
        if k in meta and (not isinstance(meta[k], list) or not meta[k]):
            errors.append(f"{key}: `{k}` must be a non-empty list")
    sources = meta.get("sources")
    for source in sources if isinstance(sources, list) else []:
        if not isinstance(source, str) or not source.startswith(SOURCE_PREFIXES):
            errors.append(f"{key}: source `{source}` is not prefixed spec:, pr: or commit:")
    successor = meta.get("superseded_by")
    if successor and status != "superseded":
        errors.append(f"{key}: `superseded_by` on a fact that is `{status}`")
    if successor and not isinstance(successor, str):
        errors.append(f"{key}: `superseded_by` must be one bundle path")
    elif successor:
        target = docs.get(successor)
        if not target or target["meta"].get("type") != "fact":
            errors.append(f"{key}: `superseded_by` {successor} is not a fact of the bundle")
    if "correction" in meta:
        check_correction(meta, key, errors)


def is_correction(meta: dict) -> bool:
    return meta.get("type") == "fact" and "correction" in meta


def check_correction(meta: dict, key: str, errors: list) -> None:
    if not isinstance(meta["correction"], str) or not meta["correction"].strip():
        errors.append(f"{key}: `correction` must name the class of error")
    if meta.get("status") == "proposed":
        errors.append(f"{key}: a correction fact is never `proposed`")
    sources = meta.get("sources")
    seen: set[str] = set()
    for source in sources if isinstance(sources, list) else []:
        if not isinstance(source, str):
            continue
        if not source.startswith(OCCURRENCE_PREFIXES):
            errors.append(f"{key}: correction source `{source}` is not an occurrence (commit: or pr:)")
        if source in seen:
            errors.append(f"{key}: correction source `{source}` is listed twice")
        seen.add(source)


def repeated_corrections(docs: dict) -> list[dict]:
    out = []
    for doc in docs.values():
        meta = doc["meta"]
        if not is_correction(meta) or meta.get("status") != "current":
            continue
        sources = meta.get("sources") if isinstance(meta.get("sources"), list) else []
        # Distinct occurrences only: a duplicate or a stray `spec:` source is a validation
        # error, and must not fire `/ss:correct` on its own.
        occurrences = {s for s in sources if isinstance(s, str) and s.startswith(OCCURRENCE_PREFIXES)}
        if len(occurrences) >= REPEATED_AT:
            out.append({"file": doc["key"], "correction": meta["correction"], "sources": sources})
    return out


def check_scalars(doc: dict, errors: list) -> None:
    for k, raw in doc["raw"]:
        if k not in FREE_TEXT:
            continue
        # `parse_value` hands back the raw text when the quoting is not valid JSON.
        if not raw.strip().startswith("\"") or parse_value(raw) == raw.strip():
            errors.append(f"{doc['key']}: `{k}` must be one double-quoted JSON string")


def validate(wiki: Path, orphans_on: bool = True) -> dict:
    errors, warnings, orphans = [], [], []
    docs = load(wiki)

    for name in RESERVED:
        path = wiki / name
        if path.is_file() and split_frontmatter(path.read_text(encoding="utf-8"))[0] is not None:
            errors.append(f"/{name}: a reserved file carries no frontmatter")

    for key, doc in docs.items():
        meta = doc["meta"]
        if not doc["has_frontmatter"]:
            errors.append(f"{key}: no frontmatter")
            continue
        kind = meta.get("type")
        if kind == "fact":
            if not key.startswith("/facts/"):
                warnings.append(f"{key}: a fact outside facts/")
            check_fact(doc, docs, errors)
        elif kind == "entity":
            if meta.get("kind") not in KINDS:
                errors.append(f"{key}: unknown entity kind `{meta.get('kind')}`")
            for k in ("title", "description"):
                if not meta.get(k):
                    errors.append(f"{key}: missing `{k}`")
        else:
            errors.append(f"{key}: `type` must be fact or entity, got `{kind}`")
        check_scalars(doc, errors)
        body = strip_backlinks(doc["body"])
        if "[[" in body:
            errors.append(f"{key}: `[[wikilink]]` found, links are markdown")
        for link in LINK.findall(body):
            if not (wiki / link.lstrip("/")).is_file():
                errors.append(f"{key}: link {link} does not resolve")

    if orphans_on:
        files = tracked_files(wiki)
        if files is None:
            warnings.append("not a git repository: orphan paths not checked")
        else:
            for doc in docs.values():
                meta = doc["meta"]
                if meta.get("type") != "fact" or meta.get("status") != "current":
                    continue
                for pattern in meta.get("paths") or []:
                    if not fact_matches([pattern], files):
                        orphans.append({"file": doc["key"], "path": pattern})
            if orphans:
                warnings.append(f"{len(orphans)} fact path(s) match no tracked file")

    return {
        "wiki": str(wiki),
        "errors": errors,
        "warnings": warnings,
        "orphans": orphans,
        "repeated_corrections": repeated_corrections(docs),
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate the .ss/wiki/ bundle.")
    parser.add_argument("--wiki", default=None, help="The bundle directory (default: <.ss root>/.ss/wiki).")
    parser.add_argument("--no-orphans", action="store_true", help="Skip the orphan-path check.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    wiki = wiki_dir(args.wiki)
    if not wiki.is_dir():
        empty = {"errors": [], "warnings": ["no wiki"], "orphans": [], "repeated_corrections": []}
        print(json.dumps({"wiki": str(wiki), **empty}))
        return
    result = validate(wiki, not args.no_orphans)
    print(json.dumps(result, indent=2))
    sys.exit(1 if result["errors"] else 0)


if __name__ == "__main__":
    main()
