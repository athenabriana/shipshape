import { expect, test } from "bun:test";
import { childEnv, redact, secretsOf } from "../redact.ts";

const env = {
  TELEGRAM_BOT_TOKEN: "123456789:AAH-bot-secret-value",
  CLAUDE_CODE_OAUTH_TOKEN: "sk-ant-oat01-claude-secret-value",
  PATH: "/usr/bin",
  HOME: "/home/x",
};

test("both tokens are masked wherever they appear, glued to other text too", () => {
  const secrets = secretsOf(env);
  const line = `GET https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/getUpdates auth=${env.CLAUDE_CODE_OAUTH_TOKEN}x`;
  const out = redact(line, secrets);
  expect(out).not.toContain("bot-secret");
  expect(out).not.toContain("claude-secret");
  expect(out).toContain("/bot<redacted>/getUpdates");
  expect(out).toContain("auth=<redacted>x");
});

test("a short or empty value is never a mask, so ordinary text survives", () => {
  expect(secretsOf({ TELEGRAM_BOT_TOKEN: "", CLAUDE_CODE_OAUTH_TOKEN: "abc" })).toEqual([]);
  expect(redact("nothing here", [])).toBe("nothing here");
});

test("a padded token is masked in both forms", () => {
  const secrets = secretsOf({ CLAUDE_CODE_OAUTH_TOKEN: " sk-ant-oat01-padded-secret " });
  expect(redact("x sk-ant-oat01-padded-secret y", secrets)).toBe("x <redacted> y");
});

test("children get no token unless one is kept by name", () => {
  const child = childEnv(env);
  expect(child.TELEGRAM_BOT_TOKEN).toBeUndefined();
  expect(child.CLAUDE_CODE_OAUTH_TOKEN).toBeUndefined();
  expect(child.PATH).toBe("/usr/bin");
  const agent = childEnv(env, ["CLAUDE_CODE_OAUTH_TOKEN"]);
  expect(agent.CLAUDE_CODE_OAUTH_TOKEN).toBe(env.CLAUDE_CODE_OAUTH_TOKEN);
  expect(agent.TELEGRAM_BOT_TOKEN).toBeUndefined();
});
