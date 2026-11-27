# Companion

A personal assistant on Telegram, shipped from the Ship Shape marketplace as
`companion@shipshape`. A bot you create talks to you from your phone; a small service on
your machine answers through the [Claude Agent SDK](https://code.claude.com/docs/en/agent-sdk/overview),
with a persona and permissions written in code. No Claude Code session in a terminal, no
tmux, no channel flag.

It keeps track of your Claude Code sessions for you: it reads what each one is doing,
talks to them, brings you their questions word for word and sends your answers back,
watches your PRs and pings you only when something needs you, and merges a PR on your word
behind Ship Shape's review gate and a confirm tap.

It started as the official Telegram channel plugin (Apache-2.0). `NOTICE` says where it came
from, and `UPSTREAM.md` lists what changed and how to pull upstream fixes.

## How it works

`server.ts` is a long-running program. It polls Telegram (pairing, the allowlist, the
stale-poller guard and token redaction work as upstream), and for each message from an
allowlisted person, in a direct chat, it runs one Agent SDK conversation:

- **One session per chat.** The chat's session id is kept in `sessions.json` in the state
  folder and resumed on the next message, so the conversation carries across restarts.
  `/nova` in the chat starts a fresh one. Messages sent while it is answering are answered
  together, in the next turn.
- **The persona is the system prompt.** `persona.md` is appended to Claude Code's own
  system prompt: warm, short answers in Portuguese, no offers to look, no time estimates.
- **Replies come back as before.** The final answer goes through the same Markdown, SVG and
  chunking code the channel used. The agent also has the Telegram tools in-process
  (`reply`, `notify`, `react`, `edit_message`, `download_attachment`) for progress notes,
  drawings and pings. Voice notes are transcribed first, as before.
- **The watch runs inside the service.** `scripts/watch.py` runs as a child process,
  restarted when it ends, so nothing needs re-arming after a restart. Its events wake the
  agent, which pings you with `notify` only when one needs you.
- **Your settings stay out.** The agent loads no `~/.claude` settings, CLAUDE.md or plugins
  (`settingSources: []`). Its working folder is `~/.local/share/companion/`, and its memory
  is the `memory/` folder there.

## Permissions, in code

`permissions.ts` decides every tool call, from a `PreToolUse` hook that sees each one
whatever the mode, and again in `canUseTool`. The secret paths are Claude Code deny rules
too, so a `Grep` over a folder skips them.

| kind    | what                                                                                                                                                                                                                                                                                                                                                                                          |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| allowed | reading under `~/Workspaces` (or `COMPANION_REPOS`), the plugin and its own folders; `git log/status/diff/show` and the other read-only git commands; `gh pr view/list/checks/diff`, `gh run view`, `gh search`, read-only `gh api`; `sessions.py` and `merge_gate.py`; its Telegram tools; `SendMessage`, `ListAgents`; writes in its memory folder                                          |
| denied  | the state folder (tokens, `access.json`, `sessions.json`), `.env` files, SSH, cloud, `gh` and Claude credentials, session `.key` files, raw transcripts, `/proc`, printing the environment; `gh api` mutations, `gh auth`, approving a review; every git write, force pushes included; `--admin` and `--auto` merges; deploys; any write outside its memory folder, a shell redirect included |
| asks    | everything else: a button on Telegram, **Ver mais** shows the command, and no answer within `COMPANION_ASK_TIMEOUT_SEC` (600 by default) denies                                                                                                                                                                                                                                               |

A command with a pipe, a chain, a variable or a substitution is never allowed on its own:
it asks, after the deny checks ran on the whole text.

**Merges.** The agent merges only by running the exact command `merge_gate.py` prints. The
service then runs the gate again, for that PR's head: CI green, the repository's rules
clear, a `Review loop:` verdict that still covers the head. Only when it passes, and the
turn came from a message you typed (not a voice note, not a forward), does the confirm
button reach you. Your tap is the second yes.

Every allowlisted person can message the assistant, which acts with your permissions, so
keep the allowlist to yourself. Group chats never reach it.

## Set it up

You need [Bun](https://bun.sh) and Claude Code on the machine. These steps change nothing
until you start the service.

1. **Create a bot.** In Telegram, message [@BotFather](https://t.me/BotFather), send
   `/newbot`, and give it a display name and a username ending in `bot`. BotFather replies
   with a token like `123456789:AAH...`. Skip this when you already have the bot.
2. **Install the plugin.** It brings the `/companion:access` and `/companion:configure`
   skills; its MCP server stays inert in every session.

   ```bash
   claude plugin marketplace add athenabriana/shipshape
   claude plugin install companion@shipshape
   ```

3. **Save the bot's token**, from your terminal (it asks without showing what you type and
   writes `~/.local/state/companion-telegram/.env` with mode `600`):

   ```bash
   bash "$(ls -d ~/.claude/plugins/cache/shipshape/companion/*/ | sort -V | tail -1)scripts/token-env.sh" set
   ```

4. **Make Claude's token.** Run `claude setup-token` yourself. It signs in with your
   Claude subscription in the browser and prints a long-lived token that starts with
   `sk-ant-`. Then paste it into the same file, the same way, without it ever reaching a
   chat:

   ```bash
   bash "$(ls -d ~/.claude/plugins/cache/shipshape/companion/*/ | sort -V | tail -1)scripts/token-env.sh" set claude
   ```

   The service gives that token to the Claude Code process the SDK starts, and to nothing
   else: the transcriber, the watch and the merge gate get neither token, and
   `CLAUDE_CODE_SUBPROCESS_ENV_SCRUB=1` keeps it out of the commands the agent runs.
   Anthropic's docs recommend an API key for agents built on the Agent SDK, and do not
   allow third-party products to offer claude.ai login
   ([overview](https://code.claude.com/docs/en/agent-sdk/overview)). This service is
   personal and single-user, on your own machine and your own subscription, by your choice.
   To use an API key instead, put `ANTHROPIC_API_KEY=...` in the same `.env`; it takes
   precedence.

5. **Start it.**

   ```bash
   bash "$(ls -d ~/.claude/plugins/cache/shipshape/companion/*/ | sort -V | tail -1)scripts/run-service.sh"
   ```

   It installs the dependencies and runs in the foreground; the log says
   `companion: polling as @YOURBOT`. `Ctrl-C` stops it. (`bun run companion` in the plugin's
   folder does the same, once `bun install` ran there.)

6. **Pair**, the first time. Message the bot; it replies with a six-character code. In any
   Claude Code session, run `/companion:access pair CODE`, then
   `/companion:access policy allowlist` so strangers get no reply at all. A pairing you
   already have carries over.

### Keep it running with systemd (optional)

```ini
# ~/.config/systemd/user/companion.service
[Unit]
Description=Companion, Athena's Telegram assistant
After=network-online.target

[Service]
ExecStart=/bin/bash -lc 'exec bash "$(ls -d ~/.claude/plugins/cache/shipshape/companion/*/ | sort -V | tail -1)scripts/run-service.sh"'
Restart=on-failure
RestartSec=30

[Install]
WantedBy=default.target
```

```bash
systemctl --user daemon-reload
systemctl --user enable --now companion
journalctl --user -u companion -f
```

A restart picks up a plugin update, since the launcher takes the newest installed copy.

### Stop and remove

- Stop: `Ctrl-C` in the foreground, or `systemctl --user disable --now companion`.
- Remove the unit: delete `~/.config/systemd/user/companion.service`, then
  `systemctl --user daemon-reload`.
- Remove the tokens: `token-env.sh clear claude` and `token-env.sh clear`. Revoke Claude's
  token in your Claude account settings, and the bot's with BotFather's `/revoke`.
- Remove everything: `claude plugin uninstall companion@shipshape`, then delete
  `~/.local/state/companion-telegram/` and `~/.local/share/companion/`.

## Sessions in other permission modes

Claude Code holds a message between two sessions in different permission modes until
someone approves it, and a desktop session has nowhere to show that approval. Setting
`"crossSessionInbound": "accept"` in `~/.claude/settings.json` delivers them, so the
assistant's `SendMessage` reaches every session. A repository's settings can only tighten
it. It lets any local session message any other one without approval, so weigh it.

## Settings

Set these in the `.env` (or in the unit's environment):

| variable                    | effect                                                                              |
| --------------------------- | ----------------------------------------------------------------------------------- |
| `COMPANION_REPOS`           | folders read without asking, `:`-separated, by default `~/Workspaces`               |
| `COMPANION_MODEL`           | the model, by default Claude Code's                                                 |
| `COMPANION_ASK_TIMEOUT_SEC` | how long a permission button waits before it denies, by default 600                 |
| `COMPANION_WATCH`           | `off` turns the watch off                                                           |
| `COMPANION_DATA_DIR`        | the agent's working folder, by default `${XDG_DATA_HOME:-~/.local/share}/companion` |
| `TELEGRAM_STATE_DIR`        | the state folder, by default `${XDG_STATE_HOME:-~/.local/state}/companion-telegram` |

## Formatting, images and voice

- **Markdown replies.** Answers and the `reply`, `notify` and `edit_message` tools take
  ordinary Markdown, converted to Telegram's HTML mode, with plain text as the fallback when
  Telegram refuses it. Underscores inside words and paths stay as written.
- **Drawn images.** `reply` and `notify` take `svgs`, a list of SVG documents, and an `.svg`
  path in `files` works too. Each renders to a PNG on a white background and shows inline;
  the PNG is deleted once sent. A drawing that refers to anything outside itself is
  refused. Rendering uses `@resvg/resvg-js`, which loads only when a message carries an SVG.
- **Voice notes as text.** When a transcriber is set up, a voice note or audio file is
  transcribed on arrival and reaches the agent as her words, tagged
  `voice_transcript="true"`; the recording is deleted after. A merge word never counts by
  voice.

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

Then set `COMPANION_WHISPER_BIN=$HOME/.local/src/whisper.cpp/build/bin/whisper-cli` in the
`.env`, and download a model to the default path. `ggml-small.bin` handles Portuguese well
on a CPU:

```bash
m="${XDG_DATA_HOME:-$HOME/.local/share}/whisper-cpp"
mkdir -p "$m" && curl -L -o "$m/ggml-small.bin" \
  https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin
```

With Homebrew, `brew install whisper-cpp ffmpeg` replaces the apt and build steps. To check
the setup without Telegram, run the adapter on any audio file:
`scripts/transcribe-whisper-cpp.sh some-voice-note.ogg` prints the text, and exit code 3
names what is missing.

| variable                   | effect                                                                                   |
| -------------------------- | ---------------------------------------------------------------------------------------- |
| `COMPANION_WHISPER_BIN`    | the `whisper-cli` binary, when it is not on `PATH`                                       |
| `COMPANION_WHISPER_MODEL`  | the model file, by default `${XDG_DATA_HOME:-~/.local/share}/whisper-cpp/ggml-small.bin` |
| `COMPANION_WHISPER_LANG`   | the spoken language, such as `pt`, by default `auto`                                     |
| `COMPANION_TRANSCRIBE_CMD` | another transcriber: an executable that takes the audio path and prints text, or `off`   |

## Where the state lives

- `~/.local/state/companion-telegram/` (or `$XDG_STATE_HOME/companion-telegram`, or
  `TELEGRAM_STATE_DIR`), mode `700`: both tokens in `.env`, the policy in `access.json`, the
  chat sessions in `sessions.json`, the watch's memory in `watch.json`, the poller's PID in
  `bot.pid`, pairing confirmations in `approved/`, and downloads in `inbox/`. The agent can
  read only `inbox/` there, and the `reply` tool refuses to send any other file from it.
- `~/.local/share/companion/`: the agent's working folder, and its memory in `memory/`.
- The conversations themselves are Claude Code transcripts, under `~/.claude/projects/`.

## What reaches Telegram

A permission button shows the command or path the agent wants, and **Ver mais** shows
more of it. Telegram stores that chat on its servers, and bot chats are not end-to-end
encrypted.

## The old channel setup

Up to 0.2.0 the companion was a Claude Code channel: a terminal session in tmux, launched
with `--dangerously-load-development-channels plugin:companion@shipshape`, with its persona
and permissions in that folder's files. That path is gone. The plugin's MCP server is now
inert in every session, even one launched with the channel flag, so an old launcher cannot
take the bot from the service: stop it (`companion.sh stop`) before you start the service.
