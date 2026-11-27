/**
 * The companion's MCP server in a Claude Code session: no tools, no bot.
 *
 * Part of the companion plugin, Apache License, Version 2.0 (see LICENSE and NOTICE).
 *
 * The companion runs as a service of its own (`bun run companion`), so the plugin's MCP
 * server never polls Telegram. It answers the MCP handshake with no tools and tells the
 * session where the bot lives, so the plugin can stay enabled for its skills without
 * taking the bot from the service. It never reads the token, never writes bot.pid and
 * never starts the bot. It imports nothing outside Bun itself, so it runs no `bun install`.
 */

const INSTRUCTIONS = [
  "The companion Telegram channel is off in this session: the companion runs as a service of its own",
  "(`bun run companion` in the plugin's folder, or its systemd unit), answering through the Claude Agent SDK.",
  "Messages sent to the bot reach that service, not this session, even when it was launched with `--channels`.",
  "If the user asks about the bot here, tell them that, and that `/companion:configure` shows the setup.",
].join(" ");

type Message = {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: { protocolVersion?: string };
};

function send(message: object): void {
  process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", ...message })}\n`);
}

function handle(line: string): void {
  let msg: Message;
  try {
    msg = JSON.parse(line);
  } catch {
    send({ id: null, error: { code: -32700, message: "Parse error" } });
    return;
  }
  // A notification, a response, or anything that is not a request needs no answer.
  if (typeof msg !== "object" || msg === null || Array.isArray(msg)) return;
  if (msg.id === undefined || msg.id === null || typeof msg.method !== "string") return;
  switch (msg.method) {
    case "initialize":
      send({
        id: msg.id,
        result: {
          protocolVersion: msg.params?.protocolVersion ?? "2025-06-18",
          capabilities: { tools: {} },
          serverInfo: { name: "telegram", version: "1.0.0" },
          instructions: INSTRUCTIONS,
        },
      });
      return;
    case "ping":
      send({ id: msg.id, result: {} });
      return;
    case "tools/list":
      send({ id: msg.id, result: { tools: [] } });
      return;
    default:
      send({ id: msg.id, error: { code: -32601, message: `Method not found: ${msg.method}` } });
  }
}

export function runInert(): Promise<never> {
  process.stderr.write(
    "companion: inert. The companion runs as its own service now, not as a channel.\n",
  );

  let buffered = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk: string) => {
    buffered += chunk;
    for (let end = buffered.indexOf("\n"); end >= 0; end = buffered.indexOf("\n")) {
      const line = buffered.slice(0, end).trim();
      buffered = buffered.slice(end + 1);
      if (line) handle(line);
    }
  });

  const exit = () => process.exit(0);
  process.stdin.on("end", exit);
  process.stdin.on("close", exit);
  process.on("SIGTERM", exit);
  process.on("SIGINT", exit);
  process.on("SIGHUP", exit);
  // Upstream's watchdog: the end and close events alone can miss the CLI's death.
  setInterval(() => {
    if (process.stdin.destroyed || process.stdin.readableEnded) exit();
  }, 5000).unref();

  // Hold the importing module here, so the caller never reaches its bot code.
  return new Promise<never>(() => {});
}
