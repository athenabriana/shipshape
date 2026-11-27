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
| `reply`               | answers a chat with text, files and drawn images, split at 4096 characters         |
| `notify`              | sends news nobody asked for yet to every allowlisted person, with no `chat_id`     |
| `react`               | adds an emoji reaction, from Telegram's fixed list                                 |
| `edit_message`        | edits a message the bot sent, for progress updates                                 |
| `download_attachment` | saves an inbound file to `~/.claude/channels/telegram/inbox/` and returns its path |

Inbound photos download on arrival and reach the session as an `image_path`. Telegram's Bot
API has no history or search, so the session sees only messages as they arrive.

## Formatting, images and voice

The plugin adds three things to the upstream channel, so the companion reads well on a phone.

- **Markdown replies.** `reply`, `notify` and `edit_message` take ordinary Markdown by
  default (`format: "markdown"`): bold, italic, strikethrough, inline code, code blocks,
  links, headings, lists and quotes. The plugin converts it to Telegram's HTML mode, and
  sends plain text when Telegram still refuses the result. `text` and `markdownv2` work as
  upstream.
- **Drawn images.** `reply` and `notify` take `svgs`, a list of SVG documents, and an `.svg`
  path in `files` works too. Each renders to a PNG on a white background, at twice its size
  up to 4000 pixels, and shows inline. The companion session cannot write files, so it
  draws diagrams and charts this way. Rendering uses `@resvg/resvg-js`, which ships
  prebuilt for Linux, macOS and Windows.
- **Voice notes as text.** Claude cannot listen to audio. When a transcriber is set up, a
  voice note or audio file is transcribed on arrival and reaches the session as the
  message, tagged `voice_transcript="true"`, with the audio's path in `audio_path`. Without
  one, it stays an attachment, as upstream.

### Set up voice transcription

The default transcriber is `scripts/transcribe-whisper-cpp.sh`, which runs whisper.cpp
locally, so the audio never leaves your machine. It needs `ffmpeg`, whisper.cpp's
`whisper-cli` and a model. The adapter finds `whisper-cli` in this order: the path in
`COMPANION_WHISPER_BIN`, then `whisper-cli` on `PATH`, then the older name `whisper-cpp` on
`PATH`.

On Ubuntu and Pop!\_OS, ffmpeg comes from apt. whisper.cpp has no apt package there, so build
it and link the binary into `~/.local/bin`, which is on `PATH`:

```bash
sudo apt install -y ffmpeg git cmake build-essential
git clone --depth 1 https://github.com/ggml-org/whisper.cpp ~/.local/src/whisper.cpp
cmake -S ~/.local/src/whisper.cpp -B ~/.local/src/whisper.cpp/build -DCMAKE_BUILD_TYPE=Release
cmake --build ~/.local/src/whisper.cpp/build -j --config Release
mkdir -p ~/.local/bin && ln -sf ~/.local/src/whisper.cpp/build/bin/whisper-cli ~/.local/bin/whisper-cli
```

Then download a model to the default path. `ggml-small.bin` handles Portuguese well on a
CPU:

```bash
mkdir -p ~/.local/share/whisper-cpp
curl -L -o ~/.local/share/whisper-cpp/ggml-small.bin \
  https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin
```

With Homebrew (macOS, or Linuxbrew), `brew install whisper-cpp ffmpeg` replaces the apt and
build steps.

To check the setup without Telegram, run the adapter on any audio file:
`scripts/transcribe-whisper-cpp.sh some-voice-note.ogg` prints the text, and exit code 3
names what is missing.

Restart the companion session after installing. These variables tune it, set in the
command that launches the session:

| variable                   | effect                                                                       |
| -------------------------- | ---------------------------------------------------------------------------- |
| `COMPANION_WHISPER_BIN`    | the `whisper-cli` binary, when it is not on `PATH`                           |
| `COMPANION_WHISPER_MODEL`  | the model file, by default `~/.local/share/whisper-cpp/ggml-small.bin`       |
| `COMPANION_WHISPER_LANG`   | the spoken language, such as `pt`, by default `auto`                         |
| `COMPANION_TRANSCRIBE_CMD` | another transcriber: an executable that takes the audio path and prints text |

Set `COMPANION_TRANSCRIBE_CMD=off` to keep voice notes as attachments. A cloud transcriber
fits the same slot as a script that reads its own API key from its own file. The plugin
never holds that key.

## Where the state lives

Everything sits in `~/.claude/channels/telegram/` (or `TELEGRAM_STATE_DIR`): the token in
`.env`, the policy in `access.json`, the poller's PID in `bot.pid`, and downloads in
`inbox/`. The `reply` tool refuses to send any file from that folder except `inbox/`.
