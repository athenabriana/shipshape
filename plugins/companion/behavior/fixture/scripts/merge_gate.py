#!/usr/bin/env python3
"""
The fixture `merge_gate.py` of the companion's behavior harness: prints the scenario's gate
answer for the PR asked, in the real script's shape.

Part of the companion plugin, Apache License, Version 2.0 (see LICENSE and NOTICE).
"""

import json
import os
import sys

args = sys.argv[1:]
with open(os.environ["COMPANION_CALLS"], "a", encoding="utf-8") as log:
    log.write(json.dumps({"t": "script", "name": "merge_gate.py", "args": args}) + "\n")
with open(os.environ["COMPANION_FIXTURE"], encoding="utf-8") as f:
    world = json.load(f)

key = f"{args[0]}#{args[1]}" if len(args) >= 2 else ""
gate = world.get("gates", {}).get(key)
if gate is None:
    print(json.dumps({"error": f"{key} not found"}))
    sys.exit(1)
print(json.dumps(gate, ensure_ascii=False))
