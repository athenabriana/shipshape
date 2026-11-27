# Upstream

This plugin started as the Telegram channel plugin in
[anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official),
path `external_plugins/telegram`, version 0.0.7, commit
`1e96c6b0a0f06cad576086243f3d06397c4ddf44`, under the Apache License 2.0.

## What changed from upstream

| file                                     | change                                                                                                     |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `server.ts`                              | a modification notice in the header comment                                                                |
| `server.ts`                              | stays inert unless `COMPANION_CHANNEL=1`, by a call to `runInert()` right after the imports                |
| `server.ts`                              | redacts the bot token from every stderr line                                                               |
| `server.ts`                              | `/telegram:access` renamed to `/companion:access` in replies, errors and the session instructions          |
| `inert.ts`                               | new: the MCP server with no tools that runs when the channel was not asked for                             |
| `skills/access/SKILL.md`                 | rewritten in Ship Shape's style, same rules (user-typed requests only, never auto-pick a pairing code)     |
| `skills/configure/SKILL.md`              | rewritten, and steers the token to the terminal instead of the chat, never echoing it                      |
| `README.md`                              | rewritten for this plugin's setup                                                                          |
| `ACCESS.md`                              | the title and the skill name                                                                               |
| `.claude-plugin/plugin.json`             | name `companion`, version 0.1.0, author and license                                                        |
| `package.json`, `bun.lock`               | package name `companion`                                                                                   |
| `NOTICE`, `UPSTREAM.md`                  | new                                                                                                        |
| `server.ts`                              | `reply` takes Markdown by default, `svgs`, and `.svg` paths; shares `deliver()` with the new `notify` tool |
| `server.ts`                              | `edit_message` takes Markdown by default                                                                   |
| `server.ts`                              | voice and audio messages transcribed on arrival; `download_attachment`'s body moved to `downloadToInbox()` |
| `server.ts`                              | session instructions name Markdown, `svgs`, voice transcripts and `notify`                                 |
| `format.ts`, `media.ts`, `transcribe.ts` | new: Markdown to Telegram HTML, SVG to PNG, the transcriber hook                                           |
| `scripts/transcribe-whisper-cpp.sh`      | new: the default transcriber                                                                               |
| `test/`                                  | new: tests for the three modules, run by CI                                                                |
| `package.json`, `bun.lock`               | `@resvg/resvg-js` added, a `test` script                                                                   |

Kept as upstream: the state folder `~/.claude/channels/telegram/` (so the official plugin's
token and allowlist carry over), the MCP server name `telegram`, pairing, the allowlist,
static mode, the `.env` loading with `chmod 600`, the stale-poller guard through `bot.pid`,
the permission relay and every upstream tool. `server.ts` keeps upstream's formatting and is listed in
`.oxfmtrc.json`'s `ignorePatterns`, so an upstream diff applies cleanly.

## Pull an upstream fix

1. Find the upstream commits since the one above:

   ```bash
   gh api 'repos/anthropics/claude-plugins-official/commits?path=external_plugins/telegram' \
     --jq '.[] | .sha[:7] + " " + .commit.message[:72]'
   ```

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

   Do the same for `package.json` and `bun.lock`, then keep the name `companion` in both.
   Port a skill or doc change by hand, since those files were rewritten.

4. Check that the result still calls `runInert()` before reading the token, still redacts
   the token, and names no `/telegram:` skill. Then update the commit and version at the top
   of this file and in `NOTICE`, and bump `version` in `.claude-plugin/plugin.json`.
