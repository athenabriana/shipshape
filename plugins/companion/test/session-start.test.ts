import { describe, expect, test } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";
import { frame, output } from "../hooks/session-start.ts";

const root = join(import.meta.dir, "..");

describe("session-start hook", () => {
  test("resolves every <plugin-root> to the plugin folder", () => {
    const text = readFileSync(join(root, "assistant.md"), "utf8");
    const got = frame("/opt/companion", text);
    expect(got).not.toContain("<plugin-root>");
    expect(got).toContain("python3 /opt/companion/scripts/sessions.py");
    expect(got).toContain("python3 /opt/companion/scripts/watch.py");
    expect(got).toContain("python3 /opt/companion/scripts/merge_gate.py");
  });

  test("prints SessionStart additionalContext", () => {
    const parsed = JSON.parse(output("hello"));
    expect(parsed).toEqual({
      hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: "hello" },
    });
  });

  test("hooks.json runs the hook with bun from the plugin root", () => {
    const hooks = JSON.parse(readFileSync(join(root, "hooks", "hooks.json"), "utf8"));
    const command = hooks.hooks.SessionStart[0].hooks[0].command;
    expect(command).toBe('bun "${CLAUDE_PLUGIN_ROOT}/hooks/session-start.ts"');
  });

  test("prints nothing outside the channel session", async () => {
    // Run from a plain shell: no claude ancestor names the channel.
    const proc = Bun.spawnSync(["bun", join(root, "hooks", "session-start.ts")], {
      env: { ...process.env, CLAUDE_PLUGIN_ROOT: root },
    });
    expect(proc.exitCode).toBe(0);
    expect(proc.stdout.toString()).toBe("");
  });
});
