#!/usr/bin/env python3
"""Pick the route for a bug fix, feature or refactor from five risk facts.

The same facts give the same route on every run, so the route is never a mood.

    python3 route.py --blast-radius medium --reversible yes --data-or-auth no \
        --coverage some --files 4

Prints one line, ``<route>: <reason>``, where route is lightweight, standard or intensive.
"""

from __future__ import annotations

import argparse
import sys

ROUTES = ("lightweight", "standard", "intensive")


def pick(blast_radius: str, reversible: str, data_or_auth: str, coverage: str, files: int) -> tuple[str, str]:
    # Any one of these alone makes the change dangerous to get wrong.
    hard = []
    if blast_radius == "high":
        hard.append("high blast radius")
    if reversible == "no":
        hard.append("not reversible")
    if data_or_auth == "yes":
        hard.append("touches data or auth")
    if hard:
        return "intensive", ", ".join(hard)

    # Each of these adds risk. Partial coverage only counts once the change spreads past
    # two files: a one-file fix with some tests nearby is still a light change.
    soft = []
    if blast_radius == "medium":
        soft.append("medium blast radius")
    if coverage == "none":
        soft.append("no tests nearby")
    elif coverage == "some" and files > 2:
        soft.append("partial coverage")
    if files > 2:
        soft.append(f"{files} files")

    if len(soft) >= 3:
        return "intensive", ", ".join(soft)
    if soft:
        return "standard", ", ".join(soft)
    return "lightweight", "small, reversible, covered change"


def main(argv: list[str]) -> int:
    p = argparse.ArgumentParser(description="Pick the route from five risk facts.")
    p.add_argument("--blast-radius", choices=("low", "medium", "high"), required=True)
    p.add_argument("--reversible", choices=("yes", "no"), required=True)
    p.add_argument("--data-or-auth", choices=("yes", "no"), required=True)
    p.add_argument("--coverage", choices=("good", "some", "none"), required=True)
    p.add_argument("--files", type=int, required=True)
    a = p.parse_args(argv)
    if a.files < 0:
        p.error("--files must be 0 or more")
    route, reason = pick(a.blast_radius, a.reversible, a.data_or_auth, a.coverage, a.files)
    print(f"{route}: {reason}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
