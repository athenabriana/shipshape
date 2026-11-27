/**
 * SessionStart hook: gives the channel session its assistant's frame.
 *
 * Part of the companion plugin, Apache License, Version 2.0 (see LICENSE and NOTICE).
 *
 * In the session launched with this plugin as a channel (the same test the server uses,
 * `channel.ts`), it prints `assistant.md` as `additionalContext`, with `<plugin-root>`
 * resolved to this plugin's folder. It runs at startup and again after a compaction, when
 * the frame is easiest to lose. In every other session it prints nothing, so the plugin
 * enabled elsewhere changes nothing there. It never fails the session: any error is a
 * silent exit 0.
 */

import { readFileSync } from "fs";
import { dirname, join } from "path";
import { launchedAsChannel } from "../channel.ts";

export function frame(root: string, text: string): string {
  return text.replaceAll("<plugin-root>", root).trim();
}

export function output(context: string): string {
  return JSON.stringify({
    hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: context },
  });
}

if (import.meta.main) {
  try {
    if (launchedAsChannel()) {
      const root = process.env.CLAUDE_PLUGIN_ROOT || dirname(import.meta.dir);
      const text = readFileSync(join(root, "assistant.md"), "utf8");
      process.stdout.write(output(frame(root, text)));
    }
  } catch {
    // A missing file or an unreadable process tree leaves the session as it was.
  }
  process.exit(0);
}
