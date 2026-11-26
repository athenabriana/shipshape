#!/usr/bin/env python3
"""Make a front's slug and its `name` for start_session from a slug or title.

start_session takes `[a-z0-9-]` and at most 24 characters, and derives a name
by cutting mid-word when none is passed. This makes the name deterministically:
fold to ASCII, kebab, and cut at the last hyphen that fits. The first word alone
passing 24 is the one case a word is cut.

A slug already used by a front gets a suffix: `-2`, then `-3`, and so on, the
first one free. A slug is used when the orchestrator passes it in `--taken`
(the doc fronts it read from the Artifact listing), or when `SS_HOME/fronts/<slug>/`,
`SS_HOME/outage/<slug>/` or `SS_HOME/outage/<slug>.merged-*/` exists. `SS_HOME`
comes from the environment and defaults to `~/.ss`. When suffixed, the base is
cut so the suffix still fits in the 24 characters of `name`.

A name already held by a live session of the run is flagged, never suffixed:
the orchestrator picks another slug.

Output (one JSON object on stdout):
  {"slug": "orchestrate-session-naming", "base": "orchestrate-session-naming",
   "suffixed": false, "name": "orchestrate-session", "cut": true,
   "collision": false}
  Exit 1 with {"error": ...} when nothing of the input survives the charset.
  Exit 2 with {"error": ...} on a usage error.

Usage:
  python3 front_name.py <slug-or-title> [--live NAME ...] [--taken SLUG ...]
  python3 front_name.py "Fix sessão naming" --live session-naming,add-edge-cases
  python3 front_name.py fix-login --taken fix-login,fix-login-2
"""

import argparse
import json
import os
import re
import sys
import unicodedata
from pathlib import Path

MAX_LEN = 24
# Letters NFKD does not decompose into an ASCII base would be dropped whole.
FOLD = str.maketrans(
    {"ß": "ss", "ø": "o", "Ø": "O", "æ": "ae", "Æ": "AE", "œ": "oe", "Œ": "OE",
     "ł": "l", "Ł": "L", "đ": "d", "Đ": "D", "þ": "th", "Þ": "TH"}
)


def kebab(text):
    """Fold accents to ASCII and reduce to lowercase `[a-z0-9-]`."""
    folded = unicodedata.normalize("NFKD", text.translate(FOLD))
    folded = folded.encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", folded.lower()).strip("-")


def cut(slug, limit=MAX_LEN):
    if len(slug) <= limit:
        return slug
    # A hyphen at index `limit` still leaves a `limit`-char name before it.
    idx = slug.rfind("-", 0, limit + 1)
    if idx <= 0:
        return slug[:limit]
    return slug[:idx]


def split_names(values):
    names = []
    for value in values or []:
        names.extend(n.strip().lower() for n in value.split(",") if n.strip())
    return names


# Kept under its old name: callers and tests import it.
live_names = split_names


def ss_home():
    return Path(os.environ.get("SS_HOME") or "~/.ss").expanduser()


def used_at_home(slug, home):
    """True when a file front, an outage or a merged outage holds the slug."""
    if (home / "fronts" / slug).exists() or (home / "outage" / slug).exists():
        return True
    outage = home / "outage"
    return outage.is_dir() and any(outage.glob(f"{slug}.merged-*"))


def free_slug(base, taken, home):
    """Return (slug, suffix): the base when free, else the first free `base-N`."""
    def used(candidate):
        return candidate in taken or used_at_home(candidate, home)

    if not used(base):
        return base, ""
    n = 2
    while used(f"{base}-{n}"):
        n += 1
    return f"{base}-{n}", f"-{n}"


def make_name(base, suffix):
    if not suffix:
        return cut(base)
    return cut(base, MAX_LEN - len(suffix)) + suffix


class JsonArgumentParser(argparse.ArgumentParser):
    # The caller parses stdout as JSON, so a usage error has to be JSON too.
    def error(self, message):
        print(json.dumps({"error": message}))
        sys.exit(2)


def main(argv=None):
    parser = JsonArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("source", help="the front's slug or title")
    parser.add_argument(
        "--live",
        nargs="*",
        default=[],
        help="names of the run's live sessions (space or comma separated)",
    )
    parser.add_argument(
        "--taken",
        nargs="*",
        default=[],
        help="slugs doc fronts already use (space or comma separated)",
    )
    args = parser.parse_args(argv)

    base = kebab(args.source)
    if not base:
        print(json.dumps({"error": "no [a-z0-9] characters in the slug or title"}))
        return 1

    slug, suffix = free_slug(base, set(split_names(args.taken)), ss_home())
    name = make_name(base, suffix)
    print(
        json.dumps(
            {
                "slug": slug,
                "base": base,
                "suffixed": bool(suffix),
                "name": name,
                "cut": name != slug,
                "collision": name in split_names(args.live),
            }
        )
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
