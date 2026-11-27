---
name: configure
description: Sets up the companion channel. Checks that the bot token is saved with private permissions, shows the access policy and pushes it toward a locked allowlist. Use when the person types "/companion:configure", asks to configure or set up Telegram, asks "who can reach me", or wants the Telegram channel's status.
license: Apache-2.0
metadata:
  author: Athena Briana - github.com/athenabriana
  version: 0.1.0
  upstream: anthropics/claude-plugins-official external_plugins/telegram 0.0.7 (skills/configure)
user-invocable: true
allowed-tools:
  - Read
  - Write
  - Bash(ls *)
  - Bash(mkdir *)
  - Bash(echo *)
  - Bash(chmod *)
  - Bash(stat *)
  - Bash(grep -c *)
---

# Telegram configure

Checks the bot token in `STATE_DIR/.env` and walks the person to a locked access policy. The
server reads both files when it starts.

## Resolve the state directory

Resolve it first, since a multi-bot or per-project setup can move it:

```bash
echo "${TELEGRAM_STATE_DIR:-${CLAUDE_CONFIG_DIR:-$HOME/.claude}/channels/telegram}"
```

Use the printed path below wherever `STATE_DIR` appears. The default is
`~/.claude/channels/telegram`.

Arguments passed: `$ARGUMENTS`

## Keep the token out of the chat

The token is a credential: whoever holds it can read and send as the bot. Anything typed in
the chat lands in the session transcript, so steer the person to save the token from their
own terminal, where it never reaches the conversation:

```bash
mkdir -p ~/.claude/channels/telegram && chmod 700 ~/.claude/channels/telegram
read -rs -p "Bot token: " t && printf 'TELEGRAM_BOT_TOKEN=%s\n' "$t" > ~/.claude/channels/telegram/.env && unset t
chmod 600 ~/.claude/channels/telegram/.env
```

Never read the token's value, print it, or echo it back. To check that it is there, count the
line with `grep -c '^TELEGRAM_BOT_TOKEN=' STATE_DIR/.env` and check the mode with `stat`.

## Dispatch on the arguments

### No arguments: show the status and the next step

1. **Token.** Report whether `STATE_DIR/.env` has a `TELEGRAM_BOT_TOKEN=` line, and whether
   the file's mode is `600`. If the mode is wider, run `chmod 600` on it and say so.
2. **Access.** Read `STATE_DIR/access.json`. A missing file means `dmPolicy: "pairing"` and an
   empty allowlist. Show the DM policy and what it means in one line, the allowed senders, and
   the pending pairings with their codes.
3. **Next step.** End with the one that fits:
   - No token: give the terminal commands above.
   - A token, `pairing`, and nobody allowed: "Send your bot a message on Telegram. It replies
     with a code. Approve it with `/companion:access pair CODE`."
   - A token and someone allowed: "Ready. Message your bot to reach this session."

### A token as the argument

When the person pasted the token after the command anyway, it is already in the transcript.
Save it, and tell them so in one line: the safe route next time is the terminal commands
above, and they can revoke and reissue the token with BotFather's `/revoke` if the transcript
leaves their machine.

1. Trim the argument. A BotFather token looks like `123456789:AAH...`.
2. Run `mkdir -p` on `STATE_DIR`.
3. Read `.env` if it exists, replace or add the `TELEGRAM_BOT_TOKEN=` line, keep the other
   keys, and write it back with no quotes around the value.
4. Run `chmod 600` on `STATE_DIR/.env`.
5. Confirm without repeating the token, then show the status.

### `clear`

Delete the `TELEGRAM_BOT_TOKEN=` line, or the file when that is its only line.

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
- The server reads `.env` once when it starts. After a token change, restart the session or
  run `/reload-plugins`, and say so.
- The server re-reads `access.json` on every inbound message, so a change made with
  `/companion:access` holds at once.
