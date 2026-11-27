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
session the channel is off there. The plugin's `SessionStart` hook runs there too, from the
plugin's own folder with `bun`, makes the same check, and prints nothing. Keep the plugin
enabled only in the folder the companion session runs from all the same.

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
| `reply`               | answers a chat with text, files and drawn images, split at 4096 characters               |
| `notify`              | sends news nobody asked for yet to every allowlisted person, with no `chat_id`           |
| `react`               | adds an emoji reaction, from Telegram's fixed list                                       |
| `edit_message`        | edits a message the bot sent, for progress updates                                       |
| `download_attachment` | saves an inbound file to `~/.local/state/companion-telegram/inbox/` and returns its path |

Inbound photos download on arrival and reach the session as an `image_path`. Telegram's Bot
API has no history or search, so the session sees only messages as they arrive.

## Formatting, images and voice

The plugin adds three things to the upstream channel, so the companion reads well on a phone.

- **Markdown replies.** `reply`, `notify` and `edit_message` take ordinary Markdown by
  default (`format: "markdown"`): bold, italic, strikethrough, inline code, code blocks,
  links, headings, lists and quotes. The plugin converts it to Telegram's HTML mode, and
  sends plain text when Telegram still refuses the result. Underscores inside words and
  paths, as in `__init__.py`, stay as written, and a backslash keeps the next mark literal.
  `text` and `markdownv2` work as upstream.
- **Drawn images.** `reply` and `notify` take `svgs`, a list of SVG documents, and an `.svg`
  path in `files` works too. Each renders to a PNG on a white background, at twice its size
  up to 4000 pixels, and shows inline; the PNG is deleted once sent. The companion session
  cannot write files, so it draws diagrams and charts this way. A drawing more than 20 times
  wider than tall (or the reverse) is refused, since Telegram will not show it as a photo.
  A drawing that refers to anything outside itself (an image file, a CSS `url()` that is not
  a `#fragment`) is refused, so it never pulls a file from this machine. Inline `data:`
  images work. Rendering uses `@resvg/resvg-js`, which ships
  prebuilt for Linux, macOS and Windows, and loads only when a message carries an SVG.
- **Voice notes as text.** Claude cannot listen to audio. When a transcriber is set up, a
  voice note or audio file is transcribed on arrival and reaches the session as the
  message, tagged `voice_transcript="true"`. `attachment_kind` says whether it was a voice
  note or a forwarded audio file. The recording is deleted once transcribed, and the
  transcription runs off Telegram's update queue, so a permission tap sent meanwhile is
  not held up. Without a transcriber, it stays an attachment, as upstream.

### Set up voice transcription

The default transcriber is `scripts/transcribe-whisper-cpp.sh`, which runs whisper.cpp
locally, so the audio never leaves your machine. It needs `ffmpeg`, whisper.cpp's
`whisper-cli` and a model. The adapter finds `whisper-cli` in this order: the path in
`COMPANION_WHISPER_BIN`, then `whisper-cli` on `PATH`, then the older name `whisper-cpp` on
`PATH`.

On Ubuntu and Pop!\_OS, ffmpeg comes from apt. whisper.cpp has no apt package there, so build
it:

```bash
sudo apt install -y ffmpeg git cmake build-essential
git clone --depth 1 https://github.com/ggml-org/whisper.cpp ~/.local/src/whisper.cpp
cmake -S ~/.local/src/whisper.cpp -B ~/.local/src/whisper.cpp/build -DCMAKE_BUILD_TYPE=Release
cmake --build ~/.local/src/whisper.cpp/build -j --config Release
```

Then point the adapter at the binary, in the command that launches the companion session:
`COMPANION_WHISPER_BIN=$HOME/.local/src/whisper.cpp/build/bin/whisper-cli`. Linking it into
`~/.local/bin` works too, but Ubuntu puts that folder on `PATH` only when it existed at
login, so a folder created now needs a new login first.

Then download a model to the default path. `ggml-small.bin` handles Portuguese well on a
CPU:

```bash
m="${XDG_DATA_HOME:-$HOME/.local/share}/whisper-cpp"
mkdir -p "$m" && curl -L -o "$m/ggml-small.bin" \
  https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin
```

With Homebrew (macOS, or Linuxbrew), `brew install whisper-cpp ffmpeg` replaces the apt and
build steps.

To check the setup without Telegram, run the adapter on any audio file:
`scripts/transcribe-whisper-cpp.sh some-voice-note.ogg` prints the text, and exit code 3
names what is missing.

Restart the companion session after installing. These variables tune it, set in the
command that launches the session:

| variable                   | effect                                                                                   |
| -------------------------- | ---------------------------------------------------------------------------------------- |
| `COMPANION_WHISPER_BIN`    | the `whisper-cli` binary, when it is not on `PATH`                                       |
| `COMPANION_WHISPER_MODEL`  | the model file, by default `${XDG_DATA_HOME:-~/.local/share}/whisper-cpp/ggml-small.bin` |
| `COMPANION_WHISPER_LANG`   | the spoken language, such as `pt`, by default `auto`                                     |
| `COMPANION_TRANSCRIBE_CMD` | another transcriber: an executable that takes the audio path and prints text             |

Set `COMPANION_TRANSCRIBE_CMD=off` to keep voice notes as attachments. A cloud transcriber
fits the same slot as a script that reads its own API key from its own file. The plugin
never holds that key.

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
      "mcp__plugin_companion_telegram__notify",
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

## Run it as your assistant

In the channel session, and only there, the plugin's `SessionStart` hook loads
`assistant.md`: the session becomes your assistant over all your Claude Code sessions. It
answers in your language, short, after looking rather than offering to look. It sees every
live session on the machine with `scripts/sessions.py` (the registry in
`~/.claude/sessions/` and each session's transcript, text turns only, secrets masked),
talks to them with `SendMessage`, brings you their questions and sends your answers back
word for word. A watch (`scripts/watch.py`, run by the `Monitor` tool) wakes it only when
something changed: a session waiting on you, a red CI run or a requested change on your PR,
a review asked of you, or a PR of yours with green CI and a review verdict. It pings you
with `notify` only when that needs you. It merges a PR only on your word in the Telegram
chat, after `scripts/merge_gate.py` passes Ship Shape's review gate, and Claude Code's
permission prompt for the merge reaches your phone as a button: your tap is the second
yes.

Four things make that work:

1. **Permission mode `default`, not `dontAsk`.** `dontAsk` turns every prompt into a
   denial, so the merge button could never appear. In `default`, what you allow runs, what
   you deny never runs, and anything else asks you through the bot. This setup replaces
   "Run the companion read only" above; it does not add to it.
2. **An allowlist of one: you.** The bot sends every permission button to everyone in
   `allowFrom`, and any of them can answer it. With a second person there, their tap
   would confirm your merges.
3. **Arm the watch at launch.** Monitors and crons live inside the session, so give it a
   first prompt on the command line, before the flags (the channel flag reads the
   arguments after it as channels):
   `claude "Arme a vigia." --dangerously-load-development-channels plugin:companion@shipshape`
4. **Let sessions in other permission modes talk to it.** Claude Code holds a message
   between two sessions in different permission modes until someone approves it, and a
   desktop session has nowhere to show that approval. `"crossSessionInbound": "accept"` in
   `~/.claude/settings.json` delivers them. A repository's settings can only tighten it.
   It lets any local session message any other one without approval, so weigh it.

The companion folder's `.claude/settings.json`, with `PLUGIN` the installed plugin folder
written out from your home folder, its version left as `*` so an update keeps matching
(`.claude/plugins/cache/shipshape/companion/*`):

```json
{
  "permissions": {
    "defaultMode": "default",
    "allow": [
      "Read",
      "Glob",
      "Grep",
      "ListAgents",
      "SendMessage",
      "Bash(python3 /home/YOU/PLUGIN/scripts/sessions.py*)",
      "Bash(python3 /home/YOU/PLUGIN/scripts/merge_gate.py *)",
      "Bash(python3 /home/YOU/PLUGIN/scripts/watch.py*)",
      "Bash(gh pr view:*)",
      "Bash(gh pr checks:*)",
      "Bash(gh run view:*)",
      "Bash(gh search:*)",
      "mcp__plugin_companion_telegram__reply",
      "mcp__plugin_companion_telegram__notify",
      "mcp__plugin_companion_telegram__edit_message",
      "mcp__plugin_companion_telegram__react",
      "mcp__plugin_companion_telegram__download_attachment"
    ],
    "ask": ["Bash(gh pr merge:*)"],
    "deny": [
      "AskUserQuestion",
      "Read(//home/YOU/.local/state/companion-telegram/.env)",
      "Edit(//home/YOU/.local/state/companion-telegram/.env)",
      "Read(//home/YOU/.claude/sessions/*.key)",
      "Read(//home/YOU/.claude/.credentials.json)",
      "Read(//home/YOU/.config/gh/**)",
      "Read(//home/YOU/.ssh/**)",
      "Read(//home/YOU/.aws/**)",
      "Read(//home/YOU/.netrc)",
      "Read(//home/YOU/**/.env)",
      "Read(//home/YOU/**/.env.*)",
      "Read(//home/YOU/.claude.json)",
      "Read(//home/YOU/.npmrc)",
      "Read(//home/YOU/.docker/config.json)",
      "Read(//home/YOU/.kube/**)",
      "Read(//home/YOU/.config/gcloud/**)",
      "Read(//home/YOU/.gnupg/**)",
      "Read(//home/YOU/.git-credentials)",
      "Bash(env:*)",
      "Bash(printenv:*)",
      "Bash(git push:*)",
      "Bash(gh auth:*)",
      "Bash(gh pr merge*--admin*)",
      "Bash(gh pr merge*--auto*)",
      "Bash(gh api*)"
    ]
  }
}
```

`Read` stays open because the assistant reads session transcripts and repositories across
your home folder; the deny rules close the files that hold credentials (add any other your
machine keeps, such as a cloud CLI's), and a deny on
`Read` also covers `Grep` and `Glob`. `AskUserQuestion` is denied because its dialog would
wait in a terminal nobody watches. The merge deny rules match the flag anywhere in the
command. Claude Code checks a `Monitor` command against the `Bash` rules, so the watch's own
`Bash(...)` rule lets it run and nothing else, and every `Bash` deny rule applies to it.
Writes to the session's own memory folder need no rule.

## What reaches Telegram

When the session asks permission for a tool, the bot sends the request to every allowlisted
person, and **See more** shows the tool's full input there: a command, a file's new content.
Telegram stores that chat on its servers, and bot chats are not end-to-end encrypted. Answer
in the terminal instead when the input may hold a secret.
