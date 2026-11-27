/**
 * Where the companion keeps its state: the token, access.json, bot.pid, approved/, inbox/.
 *
 * Part of the companion plugin, Apache License, Version 2.0 (see LICENSE and NOTICE).
 *
 * Upstream keeps it in ~/.claude/channels/telegram. Claude Code's `dontAsk` permission mode
 * refuses every write under a `.claude/` folder, whatever the allow rules say, so a
 * read-only companion session could not pair anyone or lock the policy there. The default
 * is therefore `${XDG_STATE_HOME:-~/.local/state}/companion-telegram`, and
 * TELEGRAM_STATE_DIR still overrides it.
 *
 * The old folder is the fallback for what already exists: on first use, a `.env` or
 * `access.json` found there and missing here is copied over with mode 600. The old folder
 * is left as it is, since it may still belong to the official plugin.
 */

import { chmodSync, constants, copyFileSync, existsSync, mkdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";

type Env = Record<string, string | undefined>;

export function stateDir(env: Env = process.env, home: string = homedir()): string {
  if (env.TELEGRAM_STATE_DIR) return env.TELEGRAM_STATE_DIR;
  return join(env.XDG_STATE_HOME || join(home, ".local", "state"), "companion-telegram");
}

/** The upstream folder, read only as a fallback. */
export function legacyStateDir(env: Env = process.env, home: string = homedir()): string {
  return join(env.CLAUDE_CONFIG_DIR || join(home, ".claude"), "channels", "telegram");
}

/**
 * Copies `.env` and `access.json` from the upstream folder when the state folder lacks
 * them. Does nothing when TELEGRAM_STATE_DIR is set: that choice is explicit. Returns the
 * names it copied. Throws on a file system error; the caller decides what that means.
 */
export function adoptLegacyState(env: Env = process.env, home: string = homedir()): string[] {
  if (env.TELEGRAM_STATE_DIR) return [];
  const dir = stateDir(env, home);
  const legacy = legacyStateDir(env, home);
  const copied: string[] = [];
  for (const name of [".env", "access.json"]) {
    const from = join(legacy, name);
    const to = join(dir, name);
    if (existsSync(to) || !existsSync(from)) continue;
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    chmodSync(dir, 0o700);
    // EXCL: never write through a link or over a file that appeared since the check.
    copyFileSync(from, to, constants.COPYFILE_EXCL);
    chmodSync(to, 0o600);
    copied.push(name);
  }
  return copied;
}
