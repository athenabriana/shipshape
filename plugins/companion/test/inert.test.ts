import { expect, test } from "bun:test";
import { mkdtempSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const entry = join(import.meta.dir, "..", "start-server.ts");

test("outside a channel session the server answers with no tools and touches no state", async () => {
  const state = mkdtempSync(join(tmpdir(), "companion-inert-"));
  const proc = Bun.spawn([process.execPath, entry], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, TELEGRAM_STATE_DIR: state, TELEGRAM_BOT_TOKEN: "1:not-used" },
  });
  const send = (m: object) => proc.stdin.write(JSON.stringify({ jsonrpc: "2.0", ...m }) + "\n");
  send({
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "t", version: "1" },
    },
  });
  send({ method: "notifications/initialized" });
  send({ id: 2, method: "tools/list" });
  send({ id: 3, method: "tools/call", params: { name: "reply", arguments: {} } });
  await proc.stdin.flush();
  await Bun.sleep(500);
  proc.stdin.end();
  const code = await proc.exited;

  const replies = (await new Response(proc.stdout).text())
    .trim()
    .split("\n")
    .map((l) => JSON.parse(l));
  expect(code).toBe(0);
  expect(replies.map((r) => r.id)).toEqual([1, 2, 3]);
  expect(replies[0].result.instructions).toContain("off in this session");
  expect(replies[1].result.tools).toEqual([]);
  expect(replies[2].error.code).toBe(-32601);
  expect(Array.from(new Bun.Glob("*").scanSync({ cwd: state, dot: true }))).toEqual([]);
});
