---
name: configure
description: Sets up the companion Telegram channel. Checks that the bot token is saved with private permissions, shows the access policy and pushes it toward a locked allowlist. Use when the person types "/companion:configure", asks to configure or set up Telegram, asks "who can reach me", or wants the Telegram channel's status.
license: Apache-2.0
metadata:
  author: Athena Briana - github.com/athenabriana
  version: 0.1.0
  upstream: the official Telegram channel plugin's configure skill, at the version plugins/companion/UPSTREAM.md names
user-invocable: true
allowed-tools:
  - Read
  - Bash(echo *)
---

# Telegram configure

Checks the bot token and walks the person to a locked access policy. The token is a
credential: whoever holds it can read and send as the bot, so this skill never reads its
value, prints it or echoes it back.

## Find the state folder and the token script

Resolve the state folder first, since a multi-bot or per-project setup can move it:

```bash
echo "${TELEGRAM_STATE_DIR:-${XDG_STATE_HOME:-$HOME/.local/state}/companion-telegram}"
```

Use the printed path below wherever `STATE_DIR` appears. The default is
`~/.local/state/companion-telegram`, outside `~/.claude/`, where a session in `dontAsk`
mode cannot write. Upstream's folder, `~/.claude/channels/telegram`, is only read as a
fallback: the channel copies an existing `.env` and `access.json` from it on its first start.

The token script is `scripts/token-env.sh` in the plugin, two folders up from this skill's
base directory: `SKILL_BASE/../../scripts/token-env.sh`, written below as `TOKEN_SCRIPT`.
It resolves the same folder by itself, and it never prints the token. Its path depends on
where the plugin is installed, so `allowed-tools` cannot name it: each call asks for
permission, and a session in `dontAsk` mode refuses it. There, tell the person to run the
terminal command below and read `TOKEN_SCRIPT status` from them instead.

| command               | what it does                                                                       |
| --------------------- | ---------------------------------------------------------------------------------- |
| `TOKEN_SCRIPT status` | prints `token: set`, `token: empty or malformed` or `token: missing`, and the mode |
| `TOKEN_SCRIPT set`    | saves a token read from stdin, keeps the other keys, sets mode 600                 |
| `TOKEN_SCRIPT clear`  | removes the token line, and `.env` when nothing else is left                       |

Arguments passed: `$ARGUMENTS`

## Dispatch on the arguments

### No arguments: show the status, then lock it down

1. **Token.** Run `TOKEN_SCRIPT status` and report what it says. A mode wider than `600`
   means the file is readable by others: rerun `TOKEN_SCRIPT set` from the terminal command
   below, which rewrites it as `600`.
2. **Channel.** Check whether this session runs the channel. When the session's MCP
   instructions say "The companion Telegram channel is off in this session", nothing here
   polls the bot: the next step is to relaunch with the channel (the launch command is in the
   plugin's `README.md`), and messages sent to the bot meanwhile reach no session.
3. **Access.** Read `STATE_DIR/access.json`. A missing file means `dmPolicy: "pairing"` and
   an empty allowlist. Show the DM policy and what it means in one line, the allowed senders,
   and the pending pairings with their codes.
4. **Next step.** Give the one that fits:
   - No token, or an empty one: the terminal command below.
   - A token, but the channel is off here: relaunch with the channel.
   - A token, the channel on, `pairing`, and nobody allowed: "Send your bot a message on
     Telegram. It replies with a code. Approve it with `/companion:access pair CODE`."
   - A token, the channel on, and someone allowed: "Ready. Message your bot to reach this
     session."
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

- A missing folder or file means the channel is not set up yet, which is not an error.
- The server reads `.env` once when it starts. After a token change, restart the channel
  session, and say so.
- The server re-reads `access.json` on every inbound message, so a change made with
  `/companion:access` holds at once.
