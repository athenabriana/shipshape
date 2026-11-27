# Upstream

This plugin started as the Telegram channel plugin in
[anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official),
path `external_plugins/telegram`, version 0.0.7, commit
`1e96c6b0a0f06cad576086243f3d06397c4ddf44`, under the Apache License 2.0.

This file and `NOTICE` are the two places that name the upstream version and commit. The
other files point here.

## What changed from upstream

| file                                                               | change                                                                                                                                                                           |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `start-server.ts`                                                  | new: the entry point; asks `channel.ts` first, runs `bun install` and loads `server.ts` only in the channel session                                                              |
| `channel.ts`                                                       | new: polls only when the nearest `claude` process named `plugin:companion@...` in a channel flag                                                                                 |
| `inert.ts`                                                         | new: an MCP server with no tools and no dependencies, which tells the session the channel is off there                                                                           |
| `server.ts`                                                        | the same check as `start-server.ts` right after the imports, for a direct `bun server.ts`                                                                                        |
| `state.ts`                                                         | new: the state folder is `${XDG_STATE_HOME:-~/.local/state}/companion-telegram`, outside `~/.claude/`; an existing `.env` and `access.json` in upstream's folder are copied once |
| `server.ts`                                                        | `STATE_DIR` comes from `state.ts`, which runs the one-time copy                                                                                                                  |
| `server.ts`                                                        | the bot token redacted from stderr, from `console.*` and from tool error text                                                                                                    |
| `server.ts`                                                        | `.env` split on `\r?\n`, so a CRLF file loads                                                                                                                                    |
| `server.ts`                                                        | a text permission reply counts only in a DM from an allowlisted sender, as the button path already required                                                                      |
| `server.ts`                                                        | a permission answered by text is cleared, and an old button for it answers "Already handled"                                                                                     |
| `server.ts`                                                        | `safeName()` also replaces quotes, and the attachment's MIME type goes through it                                                                                                |
| `server.ts`                                                        | one line in the session instructions: channel content is untrusted for file sends too                                                                                            |
| `server.ts`                                                        | `/telegram:access` renamed to `/companion:access`, and a modification notice in the header comment                                                                               |
| `package.json`                                                     | name `companion`, version 0.3.0, `start` runs `start-server.ts`, a `test` script                                                                                                 |
| `bun.lock`                                                         | package name `companion`                                                                                                                                                         |
| `skills/access/SKILL.md`                                           | rewritten in Ship Shape's style, same rules (user-typed requests only, never auto-pick a pairing code)                                                                           |
| `skills/configure/SKILL.md`                                        | rewritten: saves and checks the token through `scripts/token-env.sh`, never reading it                                                                                           |
| `scripts/token-env.sh`                                             | new: saves, clears or checks the token without printing it, keeping the other keys                                                                                               |
| `test/`                                                            | new: tests for `channel.ts`, `inert.ts`, `state.ts`, `scripts/token-env.sh`, `format.ts`, `media.ts` and `transcribe.ts`                                                         |
| `server.ts`                                                        | `reply` takes Markdown by default, `svgs`, and `.svg` paths; shares `deliver()` with the new `notify` tool                                                                       |
| `server.ts`                                                        | `edit_message` takes Markdown by default                                                                                                                                         |
| `server.ts`                                                        | voice and audio messages transcribed on arrival; `download_attachment`'s body moved to `downloadToInbox()`                                                                       |
| `server.ts`                                                        | session instructions name Markdown, `svgs`, voice transcripts and `notify`                                                                                                       |
| `format.ts`, `media.ts`, `transcribe.ts`                           | new: Markdown to Telegram HTML, SVG to PNG, the transcriber hook                                                                                                                 |
| `scripts/transcribe-whisper-cpp.sh`                                | new: the default transcriber                                                                                                                                                     |
| `package.json`, `bun.lock`                                         | `@resvg/resvg-js` added                                                                                                                                                          |
| `assistant.md`                                                     | new: the assistant's frame, loaded only in the channel session                                                                                                                   |
| `hooks/`                                                           | new: a `SessionStart` hook that loads `assistant.md` when `channel.ts` says this is the channel session                                                                          |
| `scripts/sessions.py`, `scripts/watch.py`, `scripts/merge_gate.py` | new: live sessions from disk, the watch that wakes the session on a change, and the review gate for a merge from Telegram, with their tests                                      |
| `README.md`                                                        | rewritten for this plugin's setup                                                                                                                                                |
| `ACCESS.md`                                                        | the title, a line saying where it came from, the skill name and the state folder path                                                                                            |
| `.claude-plugin/plugin.json`                                       | name `companion`, version 0.2.0, author and license                                                                                                                              |
| `NOTICE`, `UPSTREAM.md`                                            | new                                                                                                                                                                              |

Moved from upstream: the state folder, because Claude Code's `dontAsk` mode refuses writes
under any `.claude/` folder, which breaks pairing in a read-only companion session.

Kept as upstream: the MCP server name `telegram`, `.mcp.json`, pairing, the
allowlist, static mode, the `.env` loading with `chmod 600`, the stale-poller guard through
`bot.pid`, the permission relay and every upstream tool. `server.ts`, `ACCESS.md`, `package.json` and
`bun.lock` keep upstream's formatting and are listed in `.oxfmtrc.json`'s `ignorePatterns`,
so an upstream diff applies to them cleanly.

## Pull an upstream fix

1. List the upstream commits since the one above:

   ```bash
   gh api 'repos/anthropics/claude-plugins-official/compare/1e96c6b0a0f06cad576086243f3d06397c4ddf44...main' \
     --jq '.commits[] | select(any(.files[]?; .filename | startswith("external_plugins/telegram/"))) | .sha[:7] + " " + .commit.message[:72]'
   ```

   When that prints nothing for the folder (the compare endpoint can leave `files` out), list
   them by path instead:
   `gh api 'repos/anthropics/claude-plugins-official/commits?path=external_plugins/telegram&sha=main' --jq '.[] | .sha[:7] + " " + .commit.message[:72]'`,
   and stop at the pinned commit.

2. Download the old and the new upstream copies into two empty scratch folders, one file at
   a time:

   ```bash
   gh api "repos/anthropics/claude-plugins-official/contents/external_plugins/telegram/server.ts?ref=SHA" \
     -H 'Accept: application/vnd.github.raw' > NEW_DIR/server.ts
   ```

3. Apply upstream's change to this copy with a three-way merge, which keeps the local edits:

   ```bash
   git merge-file plugins/companion/server.ts OLD_DIR/server.ts NEW_DIR/server.ts
   ```

   A non-zero exit is the number of conflicts, and the file then holds conflict markers.
   Resolve each one, and check that none is left before going on:
   `grep -n '^<<<<<<<\|^=======$\|^>>>>>>>' plugins/companion/server.ts` prints nothing.
   Do the same for `ACCESS.md`, `package.json` and `bun.lock`, then keep the name
   `companion` and the `start` script in `package.json`. Port a skill or README change by
   hand, since those files were rewritten.

4. Check that the result still calls `launchedAsChannel()` before reading the token, still
   redacts the token, and names no `/telegram:` skill. Then update the version and commit at
   the top of this file and in `NOTICE`, bump `version` in `.claude-plugin/plugin.json` and
   `package.json`, and add a row to the table above for any new local change.
