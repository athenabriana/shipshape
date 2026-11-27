/**
 * What `.mcp.json` starts in a Claude Code session: always the inert server.
 *
 * Part of the companion plugin, Apache License, Version 2.0 (see LICENSE and NOTICE).
 *
 * Since 0.3.0 the companion is a standalone service (`bun run companion`, `server.ts`),
 * not a channel inside a session. The plugin stays installable for its skills
 * (`/companion:access`, `/companion:configure`), and a session that still loads it, or
 * launches it with `--channels`, gets a server with no tools that never reads the token,
 * never polls the bot and never touches the service's poller.
 */

import { runInert } from "./inert.ts";

await runInert();
