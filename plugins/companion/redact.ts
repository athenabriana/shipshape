/**
 * The service's credentials, kept out of every log line, every message to Telegram and
 * every child process that does not need them.
 *
 * Part of the companion plugin, Apache License, Version 2.0 (see LICENSE and NOTICE).
 *
 * Two tokens live in the state folder's `.env`: the bot's (`TELEGRAM_BOT_TOKEN`) and
 * Claude's (`CLAUDE_CODE_OAUTH_TOKEN`, from `claude setup-token`). The Claude Code process
 * the Agent SDK starts needs the second one and never the first; the transcriber, the
 * watch and the merge gate need neither.
 */

/** Variables that hold a credential of the service's own. */
export const SECRET_VARS = ["TELEGRAM_BOT_TOKEN", "CLAUDE_CODE_OAUTH_TOKEN", "ANTHROPIC_API_KEY"];

type Env = Record<string, string | undefined>;

/** The values to mask: each secret, and its trimmed form, never an empty string. */
export function secretsOf(env: Env = process.env): string[] {
  const values = SECRET_VARS.flatMap((k) => {
    const v = env[k];
    return v ? [v, v.trim()] : [];
  });
  return [...new Set(values)].filter((v) => v.length >= 8);
}

/** Masks every secret in the text. */
export function redact(text: string, secrets: string[] = secretsOf()): string {
  return secrets.reduce((out, secret) => out.split(secret).join("<redacted>"), text);
}

/** The environment for a child process: the parent's, minus every credential named above. */
export function childEnv(env: Env = process.env, keep: string[] = []): Env {
  const out: Env = {};
  for (const [k, v] of Object.entries(env)) {
    if (SECRET_VARS.includes(k) && !keep.includes(k)) continue;
    out[k] = v;
  }
  return out;
}
