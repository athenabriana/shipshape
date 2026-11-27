/**
 * SessionStart hook: gives the channel session its assistant's frame.
 *
 * Part of the companion plugin, Apache License, Version 2.0 (see LICENSE and NOTICE).
 *
 * In the session launched with this plugin as a channel (the same test the server uses,
 * `channel.ts`), it prints one part of `assistant.md` as `additionalContext`, with
 * `<plugin-root>` resolved to this plugin's folder. Claude Code cuts a hook's context past
 * about 10,000 characters down to a preview, so the frame comes in parts split at
 * `<!-- part N -->` lines, one per hook command (`hooks.json` runs it once per part), each
 * kept well under that. It runs at startup and again after a compaction, when the frame is
 * easiest to lose. In every other session it prints nothing. It never fails the session:
 * any error is a silent exit 0.
 *
 * Usage: bun hooks/session-start.ts PART   (PART is 1, 2, ...)
 */

import { readFileSync } from "fs";
import { dirname, join } from "path";
import { launchedAsChannel } from "../channel.ts";

/** Each part's character budget: under Claude Code's cut, with room for a long path. */
export const PART_BUDGET = 9000;

export function parts(text: string): string[] {
  return text.split(/^<!-- part \d+ -->$/m).map((p) => p.trim());
}

export function frame(root: string, text: string, part = 1): string {
  return (parts(text)[part - 1] ?? "").replaceAll("<plugin-root>", root).trim();
}

export function output(context: string): string {
  return JSON.stringify({
    hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: context },
  });
}

if (import.meta.main) {
  try {
    const part = Number(process.argv[2] ?? "1");
    if (Number.isInteger(part) && part >= 1 && launchedAsChannel()) {
      const root = process.env.CLAUDE_PLUGIN_ROOT || dirname(import.meta.dir);
      const context = frame(root, readFileSync(join(root, "assistant.md"), "utf8"), part);
      if (context) process.stdout.write(output(context));
    }
  } catch {
    // A missing file or an unreadable process tree leaves the session as it was.
  }
  process.exit(0);
}
