import { expect, test } from "bun:test";
import { spawn } from "child_process";
import { kindOf, wakes, WatchRunner } from "../watch-runner.ts";

test("only lines that may need her wake the agent", () => {
  expect(kindOf("ci-red | a/b#1 | title")).toBe("ci-red");
  expect(wakes("ci-red | a/b#1 | title")).toBe(true);
  expect(wakes("session-waiting | x | asks")).toBe(true);
  expect(wakes("watch-started | watch | 3 sessions")).toBe(false);
  expect(wakes("github-back | github | ok")).toBe(false);
  expect(wakes("watch-error | watch | a pass failed")).toBe(false);
  expect(wakes("")).toBe(false);
});

test("lines arriving together wake the agent once, quiet ones only go to the log", async () => {
  const batches: string[][] = [];
  const logs: string[] = [];
  const runner = new WatchRunner({
    pluginRoot: "/nonexistent",
    stateFile: "/nonexistent/watch.json",
    batchMs: 50,
    onEvents: (lines) => batches.push(lines),
    log: (l) => logs.push(l),
    spawnWatch: () =>
      spawn("bash", ["-c", "echo 'watch-started | watch | 0'; echo 'ci-red | a/b#1 | x'; echo 'merge-ready | a/b#2 | y'; sleep 5"], {
        stdio: ["ignore", "pipe", "pipe"],
      }),
  });
  runner.start();
  await Bun.sleep(400);
  runner.stop();
  expect(batches).toEqual([["ci-red | a/b#1 | x", "merge-ready | a/b#2 | y"]]);
  expect(logs.some((l) => l.includes("watch-started"))).toBe(true);
});

test("the watch never sees a token", async () => {
  process.env.TELEGRAM_BOT_TOKEN = "123456789:AAH-watch-test";
  process.env.CLAUDE_CODE_OAUTH_TOKEN = "sk-ant-oat01-watch-test";
  const { childEnv } = await import("../redact.ts");
  const env = childEnv();
  expect(env.TELEGRAM_BOT_TOKEN).toBeUndefined();
  expect(env.CLAUDE_CODE_OAUTH_TOKEN).toBeUndefined();
});
