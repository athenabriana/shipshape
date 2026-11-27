#!/usr/bin/env bash
# Starts the companion service from the newest installed copy of the plugin.
# Part of the companion plugin, Apache License, Version 2.0.
#
#   run-service.sh          installs the dependencies, then runs `bun server.ts` in the foreground
#
# The plugin's folder carries its version in its path
# (~/.claude/plugins/cache/shipshape/companion/<version>/), so an update lands in a new
# folder: this script picks the newest one each time it starts, and a systemd unit that
# calls it follows updates on its next restart. COMPANION_PLUGIN_DIR overrides the search.
# It reads no token itself: server.ts loads them from the state folder's .env.
set -euo pipefail

dir="${COMPANION_PLUGIN_DIR:-}"
if [ -z "$dir" ]; then
  cache="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/plugins/cache/shipshape/companion"
  dir="$(ls -d "$cache"/*/ 2>/dev/null | sort -V | tail -1 || true)"
fi
if [ -z "$dir" ] || [ ! -f "$dir/server.ts" ]; then
  echo "companion: no installed plugin found (claude plugin install companion@shipshape)" >&2
  exit 1
fi
bun="$(command -v bun || echo "$HOME/.bun/bin/bun")"
cd "$dir"
"$bun" install --no-summary >&2
exec "$bun" server.ts
