/**
 * The companion plugin's entry point, run by `bun run start` from `.mcp.json`.
 *
 * Part of the companion plugin, Apache License, Version 2.0 (see LICENSE and NOTICE).
 *
 * Decides first, with nothing installed, whether this session runs the channel
 * (`channel.ts`). Any other session gets the inert server and stops there. The channel
 * session installs the dependencies and then loads upstream's `server.ts`.
 *
 * The file name keeps "server.ts" in the process arguments on purpose: the stale-poller
 * guard in `server.ts`, and the official plugin's, recognize a poller by that substring.
 */

import { launchedAsChannel } from "./channel.ts";
import { runInert } from "./inert.ts";

if (!launchedAsChannel()) await runInert();

// stdout is the MCP transport, so the installer's output goes to stderr.
const install = Bun.spawnSync([process.execPath, "install", "--no-summary"], {
  cwd: import.meta.dir,
  stdout: "pipe",
  stderr: "pipe",
});
process.stderr.write(install.stdout);
process.stderr.write(install.stderr);
if (!install.success)
  process.stderr.write("companion: bun install failed, trying the installed modules\n");

await import("./server.ts");
