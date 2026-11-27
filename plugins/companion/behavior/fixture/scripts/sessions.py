#!/usr/bin/env python3
"""
The fixture `sessions.py` of the companion's behavior harness: the same command line and
output shape as the real one, answered from the scenario's fixture world.

Part of the companion plugin, Apache License, Version 2.0 (see LICENSE and NOTICE).
"""

import json
import os
import sys

args = sys.argv[1:]
with open(os.environ["COMPANION_CALLS"], "a", encoding="utf-8") as log:
    log.write(json.dumps({"t": "script", "name": "sessions.py", "args": args}) + "\n")
with open(os.environ["COMPANION_FIXTURE"], encoding="utf-8") as f:
    world = json.load(f)

if args[:1] == ["show"] and len(args) > 1:
    found = world.get("show", {}).get(args[1])
    if found is None:
        print(json.dumps({"error": f"no single live session matches {args[1]!r}"}))
        sys.exit(1)
    print(json.dumps(found, ensure_ascii=False))
else:
    print(json.dumps({"sessions": world.get("sessions", [])}, ensure_ascii=False))
