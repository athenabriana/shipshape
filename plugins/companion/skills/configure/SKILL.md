---
name: configure
description: Sets up the companion, the Telegram assistant that runs as a service. Checks that the bot's token and Claude's are saved with private permissions, shows the access policy and pushes it toward a locked allowlist. Use when the person types "/companion:configure", asks to configure or set up Telegram or the companion, asks "who can reach me", or wants the companion's status.
license: Apache-2.0
metadata:
  author: Athena Briana - github.com/athenabriana
  version: 0.3.0
  upstream: the official Telegram channel plugin's configure skill, at the version plugins/companion/UPSTREAM.md names
user-invocable: true
allowed-tools:
  - Read
  - Bash(echo *)
---

# Telegram configure

Checks the two tokens and walks the person to a locked access policy. Each token is a
credential: whoever holds the bot's can read and send as the bot, and whoever holds
Claude's spends the person's subscription, so this skill never reads either value, prints
it or echoes it back.

## Find the state folder and the token script

Resolve the state folder first, since a multi-bot or per-project setup can move it:

```bash
echo "${TELEGRAM_STATE_DIR:-${XDG_STATE_HOME:-$HOME/.local/state}/companion-telegram}"
```

Use the printed path below wherever `STATE_DIR` appears. The default is
`~/.local/state/companion-telegram`, outside `~/.claude/`. Upstream's folder,
`~/.claude/channels/telegram`, is only read as a fallback: the service copies an existing
`.env` and `access.json` from it on its first start.

The token script is `scripts/token-env.sh` in the plugin, two folders up from this skill's
base directory: `SKILL_BASE/../../scripts/token-env.sh`, written below as `TOKEN_SCRIPT`.
It resolves the same folder by itself, and it never prints the token. Its path depends on
where the plugin is installed, so `allowed-tools` cannot name it: each call asks for
permission, and a session in `dontAsk` mode refuses it. There, tell the person to run the
terminal command below and read `TOKEN_SCRIPT status` from them instead.

| command                      | what it does                                                                       |
| ---------------------------- | ---------------------------------------------------------------------------------- |
| `TOKEN_SCRIPT status`        | prints `token: set`, `token: empty or malformed` or `token: missing`, and the mode |
| `TOKEN_SCRIPT set`           | saves the bot's token read from stdin, keeps the other keys, sets mode 600         |
| `TOKEN_SCRIPT clear`         | removes the token line, and `.env` when nothing else is left                       |
| `TOKEN_SCRIPT status claude` | the same for Claude's token, the one `claude setup-token` prints                   |
| `TOKEN_SCRIPT set claude`    | saves Claude's token                                                               |
| `TOKEN_SCRIPT clear claude`  | removes Claude's token line                                                        |

Arguments passed: `$ARGUMENTS`

## Dispatch on the arguments

### No arguments: show the status, then lock it down

1. **Tokens.** Run `TOKEN_SCRIPT status` and `TOKEN_SCRIPT status claude`, and report what
   they say. A mode wider than `600` means the file is readable by others: rerun
   `TOKEN_SCRIPT set` from the terminal command below, which rewrites it as `600`.
2. **Service.** No session runs the bot: the companion is a service of its own, started
   with `scripts/run-service.sh` or its systemd unit (the plugin's `README.md` has both).
   Say so, and that messages sent to the bot reach it only while it runs.
3. **Access.** Read `STATE_DIR/access.json`. A missing file means `dmPolicy: "pairing"` and
   an empty allowlist. Show the DM policy and what it means in one line, the allowed senders,
   and the pending pairings with their codes.
4. **Next step.** Give the one that fits:
   - No bot token, or an empty one: the terminal command below.
   - No Claude token: "Run `claude setup-token` in your terminal, then save what it prints
     with `bash TOKEN_SCRIPT set claude`."
   - Both tokens, `pairing`, and nobody allowed: "Start the service, send your bot a message
     on Telegram. It replies with a code. Approve it with `/companion:access pair CODE`."
   - Both tokens and someone allowed: "Ready. Start the service if it is not running, and
     message your bot."
5. **Lock it down.** Always continue with the section below. Never leave `pairing` as the
   policy the person ends on.

### A token as the argument

When the person pasted the token after the command anyway, it is already in the transcript.
Save it with `printf '%s\n' 'THE_TOKEN' | TOKEN_SCRIPT set`, confirm without repeating it,
and tell them in one line that the terminal command below keeps it out of the chat next
time, and that BotFather's `/revoke` reissues it if the transcript leaves their machine.
Then show the status.

### `clear`

Run `TOKEN_SCRIPT clear` and report what it says.

## Save the token from the terminal

Steer the person to run this in their own terminal, where the token never reaches the chat.
Put the resolved script path in place of `TOKEN_SCRIPT` before you show it:

```bash
bash TOKEN_SCRIPT set
```

It asks for the token without showing what is typed, refuses an empty or malformed one, and
writes `STATE_DIR/.env` with mode `600`, keeping the other keys.

## Lock it down

The goal of every setup is `allowlist` with a known list. `pairing` exists to capture the
Telegram user IDs you do not know yet, and once they are in, it has done its job.

1. Tell the person who is on the allowlist.
2. Ask whether that is everyone who should reach them through this bot.
3. If it is and the policy is still `pairing`, offer to run `/companion:access policy
allowlist` right away, without waiting to be asked.
4. If people are missing, have each of them message the bot and approve each code with
   `/companion:access pair CODE`, then run this skill again to lock it.
5. If the allowlist is empty, have the person message the bot first to capture their own ID.
6. If the policy is already `allowlist`, confirm that this is the locked state. To add
   someone later, they send their numeric ID (from @userinfobot), or the person flips to
   `pairing` for one pairing and back.

## Notes on timing

- A missing folder or file means the companion is not set up yet, which is not an error.
- The service reads `.env` once when it starts. After a token change, restart the
  service, and say so.
- The server re-reads `access.json` on every inbound message, so a change made with
  `/companion:access` holds at once.
