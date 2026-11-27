import { describe, expect, test } from "bun:test";

import { isClaudeProcess, launchedAsChannel, namesThisChannel, type Proc } from "../channel.ts";

const CLAUDE = "/home/u/.local/bin/claude";
const BUN_RUN = ["bun", "run", "--cwd", "/plugins/companion", "--shell=bun", "--silent", "start"];

function tree(procs: Record<number, Proc>) {
  return (pid: number) => procs[pid] ?? null;
}

describe("namesThisChannel", () => {
  test("accepts either channel flag, spaced or with =, any marketplace", () => {
    expect(namesThisChannel([CLAUDE, "--channels", "plugin:companion@shipshape"])).toBe(true);
    expect(namesThisChannel([CLAUDE, "--channels=plugin:companion@shipshape"])).toBe(true);
    expect(
      namesThisChannel([
        CLAUDE,
        "--dangerously-load-development-channels",
        "plugin:companion@inline",
      ]),
    ).toBe(true);
    expect(
      namesThisChannel([
        CLAUDE,
        "--channels",
        "plugin:other@x",
        "plugin:companion@shipshape",
        "--name",
        "c",
      ]),
    ).toBe(true);
  });

  test("refuses a session without the flag, or with another channel", () => {
    expect(namesThisChannel([CLAUDE, "-p", "hello"])).toBe(false);
    expect(
      namesThisChannel([CLAUDE, "--channels", "plugin:telegram@claude-plugins-official"]),
    ).toBe(false);
    expect(namesThisChannel([CLAUDE, "--name", "plugin:companion@shipshape"])).toBe(false);
  });
});

describe("isClaudeProcess", () => {
  test("knows the native binary and cli.js, not bun or a shell", () => {
    expect(isClaudeProcess([CLAUDE, "--verbose"])).toBe(true);
    expect(isClaudeProcess(["node", "/x/node_modules/@anthropic-ai/claude-code/cli.js"])).toBe(
      true,
    );
    expect(isClaudeProcess(BUN_RUN)).toBe(false);
    expect(isClaudeProcess(["bash", "companion.sh"])).toBe(false);
  });
});

describe("launchedAsChannel", () => {
  test("true when the nearest claude named the channel", () => {
    const read = tree({
      10: { ppid: 9, args: BUN_RUN },
      9: {
        ppid: 1,
        args: [CLAUDE, "--dangerously-load-development-channels", "plugin:companion@shipshape"],
      },
    });
    expect(launchedAsChannel(10, read)).toBe(true);
  });

  test("false for a session started inside the channel session", () => {
    // The nested claude inherits the environment, but its own command line names no channel.
    const read = tree({
      20: { ppid: 19, args: BUN_RUN },
      19: { ppid: 18, args: [CLAUDE, "-p", "summarize"] },
      18: { ppid: 17, args: ["zsh", "-c", "claude -p summarize"] },
      17: { ppid: 1, args: [CLAUDE, "--channels", "plugin:companion@shipshape"] },
    });
    expect(launchedAsChannel(20, read)).toBe(false);
  });

  test("false when no claude is found or a process cannot be read", () => {
    expect(launchedAsChannel(30, tree({ 30: { ppid: 1, args: BUN_RUN } }))).toBe(false);
    expect(launchedAsChannel(40, tree({}))).toBe(false);
  });
});
