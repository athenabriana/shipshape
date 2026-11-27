#!/usr/bin/env bash
# Saves, clears or checks a token in the companion's .env, never printing it.
# Part of the companion plugin, Apache License, Version 2.0.
#
#   token-env.sh status [claude]   prints "token: set|empty|missing" and the file's mode
#   token-env.sh set [claude]      reads the token from stdin (hidden when typed), saves it
#   token-env.sh clear [claude]    removes the token line, and the file when nothing else is left
#
# Without "claude" it is the bot's token (TELEGRAM_BOT_TOKEN, from BotFather). With
# "claude" it is Claude's (CLAUDE_CODE_OAUTH_TOKEN, printed by `claude setup-token`).
#
# The folder is the one the server reads: TELEGRAM_STATE_DIR, else
# ${XDG_STATE_HOME:-~/.local/state}/companion-telegram. Upstream's folder,
# ~/.claude/channels/telegram, is only checked by `status`, since the channel
# copies a token from there on its first start.
# Other keys in .env (such as TELEGRAM_ACCESS_MODE) are kept.
set -euo pipefail
umask 077

dir="${TELEGRAM_STATE_DIR:-${XDG_STATE_HOME:-$HOME/.local/state}/companion-telegram}"
legacy_env="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/channels/telegram/.env"
env_file="$dir/.env"
case "${2:-bot}" in
  bot) key=TELEGRAM_BOT_TOKEN; shape='^[0-9]+:[A-Za-z0-9_-]+$'; label='Bot token'
       wrong='That does not look like a BotFather token (123456789:AAH...). Nothing saved.' ;;
  claude) key=CLAUDE_CODE_OAUTH_TOKEN; shape='^sk-ant-[A-Za-z0-9_-]{20,}$'; label='Claude token'
       wrong='That does not look like a token from `claude setup-token` (sk-ant-...). Nothing saved.' ;;
  *) sed -n '2,13p' "$0" >&2; exit 2 ;;
esac

without_token() { [ -f "$env_file" ] && grep -v "^$key=" "$env_file" || true; }

case "${1:-status}" in
  status)
    if [ ! -f "$env_file" ]; then
      if [ "$key" = TELEGRAM_BOT_TOKEN ] && [ -z "${TELEGRAM_STATE_DIR:-}" ] && [ -f "$legacy_env" ] && grep -q "^$key=[0-9][0-9]*:." "$legacy_env"; then
        echo "token: set in $legacy_env, copied to $env_file when the channel next starts"
      else
        echo "token: missing"
      fi
      exit 0
    fi
    if grep -E -q "^$key=${shape#^}" "$env_file"; then echo "token: set"
    elif grep -q "^$key=" "$env_file"; then echo "token: empty or malformed"
    else echo "token: missing"; fi
    echo "mode: $(stat -c %a "$env_file" 2>/dev/null || stat -f %Lp "$env_file")"
    ;;
  set)
    if [ -t 0 ]; then
      # Turn echo back on however the read ends, Ctrl-C included.
      trap 'stty echo' EXIT
      trap 'stty echo; exit 130' INT TERM
      printf '%s: ' "$label" >&2; stty -echo; IFS= read -r token || true; stty echo; printf '\n' >&2
    else
      IFS= read -r token || true
    fi
    token="${token//[[:space:]]/}"
    if ! [[ "$token" =~ $shape ]]; then
      echo "$wrong" >&2
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
    sed -n '2,13p' "$0" >&2; exit 2
    ;;
esac
