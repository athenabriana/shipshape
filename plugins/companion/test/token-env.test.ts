import { expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, statSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const script = join(import.meta.dir, "..", "scripts", "token-env.sh");

function run(state: string, args: string[], input = "") {
  const r = Bun.spawnSync(["bash", script, ...args], {
    stdin: Buffer.from(input),
    env: { ...process.env, TELEGRAM_STATE_DIR: state },
  });
  return { code: r.exitCode, out: r.stdout.toString() + r.stderr.toString() };
}

test("set keeps other keys, writes mode 600 and never prints the token", () => {
  const state = join(mkdtempSync(join(tmpdir(), "companion-token-")), "st");
  mkdirSync(state);
  writeFileSync(join(state, ".env"), "TELEGRAM_ACCESS_MODE=static\nTELEGRAM_BOT_TOKEN=old\n");
  const r = run(state, ["set"], "123456:AAH_secret-x\n");
  expect(r.code).toBe(0);
  expect(r.out).not.toContain("AAH_secret");
  expect(readFileSync(join(state, ".env"), "utf8")).toBe(
    "TELEGRAM_ACCESS_MODE=static\nTELEGRAM_BOT_TOKEN=123456:AAH_secret-x\n",
  );
  expect(statSync(join(state, ".env")).mode & 0o777).toBe(0o600);
  expect(run(state, ["status"]).out).toContain("token: set");
});

test("set refuses an empty or malformed token and writes nothing", () => {
  const state = join(mkdtempSync(join(tmpdir(), "companion-token-")), "st");
  expect(run(state, ["set"], "\n").code).toBe(2);
  expect(run(state, ["set"], "not a token\n").code).toBe(2);
  expect(existsSync(join(state, ".env"))).toBe(false);
});

test("clear drops only the token, and the file when nothing else is left", () => {
  const state = join(mkdtempSync(join(tmpdir(), "companion-token-")), "st");
  mkdirSync(state);
  writeFileSync(join(state, ".env"), "TELEGRAM_ACCESS_MODE=static\nTELEGRAM_BOT_TOKEN=1:a\n");
  run(state, ["clear"]);
  expect(readFileSync(join(state, ".env"), "utf8")).toBe("TELEGRAM_ACCESS_MODE=static\n");
  writeFileSync(join(state, ".env"), "TELEGRAM_BOT_TOKEN=1:a\n");
  run(state, ["clear"]);
  expect(existsSync(join(state, ".env"))).toBe(false);
});

test("set claude saves Claude's token beside the bot's, never printing it", () => {
  const state = join(mkdtempSync(join(tmpdir(), "companion-token-")), "st");
  mkdirSync(state);
  writeFileSync(join(state, ".env"), "TELEGRAM_BOT_TOKEN=123456:AAH_bot\n");
  const token = "sk-ant-oat01-" + "x".repeat(40);
  const r = run(state, ["set", "claude"], `${token}\n`);
  expect(r.code).toBe(0);
  expect(r.out).not.toContain("xxxxxxxx");
  expect(readFileSync(join(state, ".env"), "utf8")).toBe(
    `TELEGRAM_BOT_TOKEN=123456:AAH_bot\nCLAUDE_CODE_OAUTH_TOKEN=${token}\n`,
  );
  expect(statSync(join(state, ".env")).mode & 0o777).toBe(0o600);
  expect(run(state, ["status", "claude"]).out).toContain("token: set");
  expect(run(state, ["set", "claude"], "123456:AAH_bot\n").code).toBe(2);
  run(state, ["clear", "claude"]);
  expect(readFileSync(join(state, ".env"), "utf8")).toBe("TELEGRAM_BOT_TOKEN=123456:AAH_bot\n");
});
