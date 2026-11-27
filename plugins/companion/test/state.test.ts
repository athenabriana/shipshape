import { expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, statSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

import { adoptLegacyState, legacyStateDir, stateDir } from "../state.ts";

test("the state folder sits outside ~/.claude, and the overrides win", () => {
  expect(stateDir({}, "/h")).toBe("/h/.local/state/companion-telegram");
  expect(stateDir({ XDG_STATE_HOME: "/x" }, "/h")).toBe("/x/companion-telegram");
  expect(stateDir({ TELEGRAM_STATE_DIR: "/t", XDG_STATE_HOME: "/x" }, "/h")).toBe("/t");
  expect(legacyStateDir({}, "/h")).toBe("/h/.claude/channels/telegram");
});

test("an existing token and access.json are copied once, mode 600, never overwritten", () => {
  const home = mkdtempSync(join(tmpdir(), "companion-state-"));
  const legacy = legacyStateDir({}, home);
  mkdirSync(legacy, { recursive: true });
  writeFileSync(join(legacy, ".env"), "TELEGRAM_BOT_TOKEN=1:a\n", { mode: 0o644 });
  writeFileSync(join(legacy, "access.json"), '{"allowFrom":["1"]}\n');

  expect(adoptLegacyState({}, home)).toEqual([".env", "access.json"]);
  const dir = stateDir({}, home);
  expect(readFileSync(join(dir, ".env"), "utf8")).toBe("TELEGRAM_BOT_TOKEN=1:a\n");
  expect(statSync(join(dir, ".env")).mode & 0o777).toBe(0o600);
  expect(statSync(dir).mode & 0o777).toBe(0o700);
  expect(existsSync(join(legacy, ".env"))).toBe(true);

  writeFileSync(join(legacy, ".env"), "TELEGRAM_BOT_TOKEN=2:b\n");
  expect(adoptLegacyState({}, home)).toEqual([]);
  expect(readFileSync(join(dir, ".env"), "utf8")).toBe("TELEGRAM_BOT_TOKEN=1:a\n");
});

test("an explicit TELEGRAM_STATE_DIR copies nothing", () => {
  const home = mkdtempSync(join(tmpdir(), "companion-state-"));
  mkdirSync(legacyStateDir({}, home), { recursive: true });
  writeFileSync(join(legacyStateDir({}, home), ".env"), "TELEGRAM_BOT_TOKEN=1:a\n");
  expect(adoptLegacyState({ TELEGRAM_STATE_DIR: join(home, "t") }, home)).toEqual([]);
});

test("an empty CLAUDE_CONFIG_DIR falls back to ~/.claude, as in the token script", () => {
  expect(legacyStateDir({ CLAUDE_CONFIG_DIR: "" }, "/h")).toBe("/h/.claude/channels/telegram");
});
