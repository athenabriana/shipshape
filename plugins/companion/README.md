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
So the server polls only in the session whose `claude` command named this plugin as a
channel (`--channels plugin:companion@shipshape`, or the development flag below). It reads
that from the nearest `claude` process's own command line, so a session started from inside
the channel session, which inherits its environment but not its flags, stays out too.

Every other session gets a server with no tools that never reads the token, never starts
the bot and never touches another poller. It installs nothing either, and it tells that
session the channel is off there. Keep the plugin enabled only in the folder the companion
session runs from all the same.

## Set it up

You need [Bun](https://bun.sh): the server runs on it.

1. **Create a bot.** In Telegram, message [@BotFather](https://t.me/BotFather), send
   `/newbot`, and give it a display name and a username ending in `bot`. BotFather replies
   with a token like `123456789:AAH...`.
2. **Install the plugin at user scope, then enable it in one folder only.**

   ```bash
   claude plugin marketplace add athenabriana/shipshape
   claude plugin install companion@shipshape
   claude plugin disable companion@shipshape
   ```

   In the companion folder's `.claude/settings.json`, set
   `"enabledPlugins": { "companion@shipshape": true }`. If you used the official Telegram
   plugin before, turn it off everywhere (`claude plugin uninstall telegram@claude-plugins-official`):
   it shares this plugin's state folder and has no such switch, so in any session where it is
   enabled it would take the bot back.

3. **Save the token from your terminal.** The plugin's script asks for it without showing
   it, so it never reaches a chat transcript, and writes `.env` with mode `600`:

   ```bash
   bash "$(ls -d ~/.claude/plugins/cache/shipshape/companion/*/ | sort -V | tail -1)scripts/token-env.sh" set
   ```

   It writes to `~/.local/state/companion-telegram/.env` (under `XDG_STATE_HOME` when you
   set it, or in `TELEGRAM_STATE_DIR`), keeping any other keys in the file. A token and an
   `access.json` you already have from the official plugin, in `~/.claude/channels/telegram/`,
   carry over: the channel copies them on its first start, and leaves the old folder as it
   is.

4. **Launch the session from that folder with the channel.**

   ```bash
   claude --dangerously-load-development-channels plugin:companion@shipshape
   ```

   During the channels research preview, `--channels` accepts only plugins on Anthropic's
   allowlist or on your organization's `allowedChannelPlugins`. Until this plugin is on one
   of those, it loads with `--dangerously-load-development-channels`, which shows a warning
   you confirm on every launch. With `allowedChannelPlugins` set, use
   `--channels plugin:companion@shipshape` instead and the warning goes away.

5. **Pair.** Message your bot. It replies with a six-character code. In the session, run
   `/companion:access pair CODE`. If the bot does not answer, check that this session was
   launched with the channel flag above: `/companion:configure` says when the channel is off
   in the session it runs in.
6. **Lock it down.** Run `/companion:access policy allowlist`, so strangers get no reply at
   all.

`/companion:configure` shows where the setup stands and the next step. `ACCESS.md` covers
groups, mention patterns, delivery options and the `access.json` format.

## Tools the session gets

The MCP server is named `telegram`, so the tools read `mcp__plugin_companion_telegram__NAME`.

| tool                  | what it does                                                                             |
| --------------------- | ---------------------------------------------------------------------------------------- |
| `reply`               | sends text and files to a chat, split at Telegram's 4096-character limit                 |
| `react`               | adds an emoji reaction, from Telegram's fixed list                                       |
| `edit_message`        | edits a message the bot sent, for progress updates                                       |
| `download_attachment` | saves an inbound file to `~/.local/state/companion-telegram/inbox/` and returns its path |

Inbound photos download on arrival and reach the session as an `image_path`. Telegram's Bot
API has no history or search, so the session sees only messages as they arrive.

## Where the state lives

Everything sits in `~/.local/state/companion-telegram/` (or `$XDG_STATE_HOME/companion-telegram`,
or `TELEGRAM_STATE_DIR`): the token in `.env`, the policy in `access.json`, the poller's PID in
`bot.pid`, pairing confirmations in `approved/`, and downloads in `inbox/`. The `reply` tool
refuses to send any file from that folder except `inbox/`.

Upstream keeps this under `~/.claude/channels/telegram/`. Claude Code's `dontAsk` permission
mode refuses every write under a `.claude/` folder, whatever the allow rules say, so a
companion session in that mode could not pair anyone or change the policy there. That is why
the folder moved.

## Run the companion read only

A companion that only reads (`"defaultMode": "dontAsk"`, with everything else denied) still
needs three writes for `/companion:access`: the policy file, the pairing confirmations, and
the folder those go in. Allow exactly those in the companion folder's `.claude/settings.json`,
with the path written out from your home folder:

```json
{
  "permissions": {
    "defaultMode": "dontAsk",
    "allow": [
      "Edit(//home/YOU/.local/state/companion-telegram/access.json)",
      "Edit(//home/YOU/.local/state/companion-telegram/approved/**)",
      "Bash(mkdir -p /home/YOU/.local/state/companion-telegram/approved)",
      "mcp__plugin_companion_telegram__reply",
      "mcp__plugin_companion_telegram__react",
      "mcp__plugin_companion_telegram__edit_message",
      "mcp__plugin_companion_telegram__download_attachment"
    ],
    "deny": [
      "Read(//home/YOU/.local/state/companion-telegram/.env)",
      "Edit(//home/YOU/.local/state/companion-telegram/.env)"
    ]
  }
}
```

`Edit` rules cover every tool that writes a file, the `Write` tool included, and `//` starts an
absolute path. The deny rules keep the session away from the token. Save the token from your
terminal with the script in step 3, never from the session.

## What reaches Telegram

When the session asks permission for a tool, the bot sends the request to every allowlisted
person, and **See more** shows the tool's full input there: a command, a file's new content.
Telegram stores that chat on its servers, and bot chats are not end-to-end encrypted. Answer
in the terminal instead when the input may hold a secret.
