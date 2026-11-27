#!/usr/bin/env bash
# Saves, clears or checks the bot token in the companion's .env, never printing it.
# Part of the companion plugin, Apache License, Version 2.0.
#
#   token-env.sh status   prints "token: set|empty|missing" and the file's mode
#   token-env.sh set      reads the token from stdin (hidden when typed), saves it
#   token-env.sh clear    removes the token line, and the file when nothing else is left
#
# The folder is the one the server reads: TELEGRAM_STATE_DIR, else
# CLAUDE_CONFIG_DIR/channels/telegram, else ~/.claude/channels/telegram.
# Other keys in .env (such as TELEGRAM_ACCESS_MODE) are kept.
set -euo pipefail
umask 077

dir="${TELEGRAM_STATE_DIR:-${CLAUDE_CONFIG_DIR:-$HOME/.claude}/channels/telegram}"
env_file="$dir/.env"
key=TELEGRAM_BOT_TOKEN

without_token() { [ -f "$env_file" ] && grep -v "^$key=" "$env_file" || true; }

case "${1:-status}" in
  status)
    if [ ! -f "$env_file" ]; then echo "token: missing"; exit 0; fi
    if grep -q "^$key=[0-9][0-9]*:." "$env_file"; then echo "token: set"
    elif grep -q "^$key=" "$env_file"; then echo "token: empty or malformed"
    else echo "token: missing"; fi
    echo "mode: $(stat -c %a "$env_file" 2>/dev/null || stat -f %Lp "$env_file")"
    ;;
  set)
    if [ -t 0 ]; then
      printf 'Bot token: ' >&2; stty -echo; IFS= read -r token || true; stty echo; printf '\n' >&2
    else
      IFS= read -r token || true
    fi
    token="${token//[[:space:]]/}"
    if ! [[ "$token" =~ ^[0-9]+:[A-Za-z0-9_-]+$ ]]; then
      echo "That does not look like a BotFather token (123456789:AAH...). Nothing saved." >&2
      exit 2
    fi
    mkdir -p "$dir" && chmod 700 "$dir"
    { without_token; printf '%s=%s\n' "$key" "$token"; } > "$env_file.tmp"
    chmod 600 "$env_file.tmp" && mv "$env_file.tmp" "$env_file"
    unset token
    echo "token: saved to $env_file (mode 600)"
    ;;
  clear)
    if [ ! -f "$env_file" ]; then echo "token: already missing"; exit 0; fi
    rest="$(without_token)"
    if [ -z "$rest" ]; then rm -f "$env_file"; echo "token: cleared, .env removed"
    else printf '%s\n' "$rest" > "$env_file.tmp" && chmod 600 "$env_file.tmp" && mv "$env_file.tmp" "$env_file"; echo "token: cleared, other keys kept"; fi
    ;;
  *)
    sed -n '2,10p' "$0" >&2; exit 2
    ;;
esac
