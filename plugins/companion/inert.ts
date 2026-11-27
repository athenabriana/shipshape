/**
 * The companion server in a session that is not the channel session.
 *
 * Part of the companion plugin, Apache License, Version 2.0 (see LICENSE and NOTICE).
 *
 * It answers the MCP handshake with no tools and tells the session that the channel is off
 * here, so the plugin can stay enabled without taking the bot from the session that holds
 * it. It never reads the token, never writes bot.pid and never starts the bot. It imports
 * nothing outside Bun itself, so an inert session runs no `bun install` either.
 */

const INSTRUCTIONS = [
  "The companion Telegram channel is off in this session.",
  "It polls only in a session launched with `--channels plugin:companion@MARKETPLACE`",
  "(or `--dangerously-load-development-channels plugin:companion@MARKETPLACE`),",
  "so messages sent to the bot do not reach this session.",
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
  if (msg.id === undefined || msg.id === null) return; // a notification needs no answer
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
    "companion: inert. This session was not launched with the companion channel.\n",
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
