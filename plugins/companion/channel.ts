/**
 * Whether this server belongs to the session that runs the companion channel.
 *
 * Part of the companion plugin, Apache License, Version 2.0 (see LICENSE and NOTICE).
 *
 * A plugin's MCP server starts in every session where the plugin is enabled, and Telegram
 * lets one poller hold a bot token at a time. So the server polls only when the Claude Code
 * process that started it was launched with this plugin as a channel:
 * `--channels plugin:companion@MARKETPLACE` or
 * `--dangerously-load-development-channels plugin:companion@MARKETPLACE`.
 *
 * The answer comes from the nearest `claude` ancestor's own command line, never from an
 * environment variable: a session started from inside the channel session (a `claude -p`
 * from its shell, a session it orchestrates) inherits the environment, but its own command
 * line names no channel, so its server stays inert and never takes the bot.
 */

import { execFileSync } from "child_process";
import { readFileSync } from "fs";
import { basename } from "path";

export type Proc = { ppid: number; args: string[] };

const CHANNEL_FLAGS = ["--channels", "--dangerously-load-development-channels"];
const MAX_HOPS = 8;

/** Reads a process's parent and arguments: /proc on Linux, `ps` elsewhere. */
export function readProc(pid: number): Proc | null {
  try {
    const args = readFileSync(`/proc/${pid}/cmdline`, "utf8").split("\0").filter(Boolean);
    const stat = readFileSync(`/proc/${pid}/stat`, "utf8");
    // "PID (COMM) STATE PPID ...": COMM may hold spaces, so read after the last ")".
    const ppid = Number(stat.slice(stat.lastIndexOf(")") + 2).split(" ")[1]);
    if (Number.isInteger(ppid)) return { ppid, args };
  } catch {}
  try {
    const out = execFileSync("ps", ["-o", "ppid=", "-o", "args=", "-p", String(pid)], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    const m = /^(\d+)\s+(.*)$/.exec(out);
    return m ? { ppid: Number(m[1]), args: m[2].split(/\s+/) } : null;
  } catch {
    return null;
  }
}

/** The Claude Code CLI: the native `claude` binary, or `cli.js` run by Node or Bun. */
export function isClaudeProcess(args: string[]): boolean {
  const name = basename(args[0] ?? "");
  return (
    name === "claude" ||
    name === "claude.exe" ||
    args.some((a) => /[\\/]@anthropic-ai[\\/]claude-code[\\/]cli\.m?js$/.test(a))
  );
}

/** True when the arguments pass `plugin:companion@...` to a channel flag. */
export function namesThisChannel(args: string[], plugin = "companion"): boolean {
  const values: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const inline = CHANNEL_FLAGS.find((f) => arg.startsWith(`${f}=`));
    if (inline) values.push(arg.slice(inline.length + 1));
    else if (CHANNEL_FLAGS.includes(arg)) {
      // Take only what looks like a channel spec, so a prompt after the flag never counts.
      while (i + 1 < args.length && /^(plugin|server):\S+$/.test(args[i + 1]))
        values.push(args[++i]);
    }
  }
  return values.flatMap((v) => v.split(",")).some((v) => v.startsWith(`plugin:${plugin}@`));
}

/** Walks up to the nearest Claude Code process and asks whether it named this channel. */
export function launchedAsChannel(
  startPid: number = process.ppid,
  read: (pid: number) => Proc | null = readProc,
): boolean {
  let pid = startPid;
  for (let hop = 0; hop < MAX_HOPS && pid > 1; hop++) {
    const proc = read(pid);
    if (!proc) return false;
    if (isClaudeProcess(proc.args)) return namesThisChannel(proc.args);
    pid = proc.ppid;
  }
  return false;
}
