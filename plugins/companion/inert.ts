/**
 * The companion server when the launch did not ask for the channel.
 *
 * Part of the companion plugin, Apache License, Version 2.0 (see LICENSE and NOTICE).
 *
 * A plugin's MCP server starts in every session where the plugin is enabled.
 * Polling from all of them would take the bot from the session that should hold
 * it, so without COMPANION_CHANNEL=1 the server answers the MCP handshake with
 * no tools, never reads the token and never starts the bot. It exits when Claude
 * Code closes the connection.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

export async function runInert(): Promise<never> {
  process.stderr.write("companion: inert. Launch with COMPANION_CHANNEL=1 to poll the bot.\n");
  const mcp = new Server({ name: "telegram", version: "1.0.0" }, { capabilities: { tools: {} } });
  mcp.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [] }));
  await mcp.connect(new StdioServerTransport());

  const exit = () => process.exit(0);
  process.stdin.on("end", exit);
  process.stdin.on("close", exit);
  process.on("SIGTERM", exit);
  process.on("SIGINT", exit);
  process.on("SIGHUP", exit);

  // Hold the importing module here, so server.ts never reaches its bot code.
  return new Promise<never>(() => {});
}
