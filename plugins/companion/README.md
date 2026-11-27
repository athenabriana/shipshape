# Companion

A Telegram channel for Claude Code, shipped from the Ship Shape marketplace as
`companion@shipshape`. A bot you create bridges your Telegram messages to one Claude Code
session, and the session answers through the bot. Pairing and an allowlist decide who gets
through.

It is adapted from the official Telegram channel plugin (Apache-2.0). `NOTICE` says where it
came from, and `UPSTREAM.md` lists what changed and how to pull upstream fixes.

## How it stays out of your other sessions

Telegram lets one poller hold a bot token at a time, and this server replaces any stale
poller it finds. A plugin's MCP server starts in every session where the plugin is enabled.
So the server polls only when the session was launched with `COMPANION_CHANNEL=1`. Without
it, the server answers Claude Code with no tools and never reads the token, never starts the
bot and never touches another poller.

Keep the plugin enabled only in the folder the companion session runs from, and set the
variable only in the command that launches it.

## Set it up

You need [Bun](https://bun.sh): the server runs on it.

1. **Create a bot.** In Telegram, message [@BotFather](https://t.me/BotFather), send
   `/newbot`, and give it a display name and a username ending in `bot`. BotFather replies
   with a token like `123456789:AAH...`.
2. **Save the token from your terminal.** Typed this way, the token never reaches a chat
   transcript:

   ```bash
   mkdir -p ~/.claude/channels/telegram && chmod 700 ~/.claude/channels/telegram
   read -rs -p "Bot token: " t && printf 'TELEGRAM_BOT_TOKEN=%s\n' "$t" > ~/.claude/channels/telegram/.env && unset t
   chmod 600 ~/.claude/channels/telegram/.env
   ```

3. **Install the plugin at user scope, then enable it in one folder only.**

   ```bash
   claude plugin marketplace add athenabriana/shipshape
   claude plugin install companion@shipshape
   claude plugin disable companion@shipshape
   ```

   In the companion folder's `.claude/settings.json`, set
   `"enabledPlugins": { "companion@shipshape": true }`.

4. **Launch the session from that folder with the channel.**

   ```bash
   COMPANION_CHANNEL=1 claude --dangerously-load-development-channels plugin:companion@shipshape
   ```

   During the channels research preview, `--channels` accepts only plugins on Anthropic's
   allowlist or on your organization's `allowedChannelPlugins`. Until this plugin is on one
   of those, it loads with `--dangerously-load-development-channels`, which shows a warning
   you confirm on every launch. With `allowedChannelPlugins` set, use
   `--channels plugin:companion@shipshape` instead and the warning goes away.

5. **Pair.** Message your bot. It replies with a six-character code. In the session, run
   `/companion:access pair CODE`.
6. **Lock it down.** Run `/companion:access policy allowlist`, so strangers get no reply at
   all.

`/companion:configure` shows where the setup stands and the next step. `ACCESS.md` covers
groups, mention patterns, delivery options and the `access.json` format.

## Tools the session gets

The MCP server is named `telegram`, so the tools read `mcp__plugin_companion_telegram__NAME`.

| tool                  | what it does                                                                       |
| --------------------- | ---------------------------------------------------------------------------------- |
| `reply`               | sends text and files to a chat, split at Telegram's 4096-character limit           |
| `react`               | adds an emoji reaction, from Telegram's fixed list                                 |
| `edit_message`        | edits a message the bot sent, for progress updates                                 |
| `download_attachment` | saves an inbound file to `~/.claude/channels/telegram/inbox/` and returns its path |

Inbound photos download on arrival and reach the session as an `image_path`. Telegram's Bot
API has no history or search, so the session sees only messages as they arrive.

## Where the state lives

Everything sits in `~/.claude/channels/telegram/` (or `TELEGRAM_STATE_DIR`): the token in
`.env`, the policy in `access.json`, the poller's PID in `bot.pid`, and downloads in
`inbox/`. The `reply` tool refuses to send any file from that folder except `inbox/`.
