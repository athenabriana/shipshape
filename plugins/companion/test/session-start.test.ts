import { describe, expect, test } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";
import { frame, output, PART_BUDGET, parts } from "../hooks/session-start.ts";

const root = join(import.meta.dir, "..");
const text = readFileSync(join(root, "assistant.md"), "utf8");
const hooks = JSON.parse(readFileSync(join(root, "hooks", "hooks.json"), "utf8"));
const commands: string[] = hooks.hooks.SessionStart[0].hooks.map(
  (h: { command: string }) => h.command,
);
// A long, realistic install path: the budget must hold with it put in at every placeholder.
const longRoot =
  "/home/someone-with-a-long-name/.claude/plugins/cache/shipshape/companion/10.20.30";

describe("session-start hook", () => {
  test("hooks.json runs one command per part, from the plugin folder", () => {
    expect(commands.length).toBe(parts(text).length);
    commands.forEach((command, i) => {
      expect(command).toBe(`cd "\${CLAUDE_PLUGIN_ROOT}" && bun hooks/session-start.ts ${i + 1}`);
    });
  });

  test("every part fits under Claude Code's cut, with a long path", () => {
    parts(text).forEach((_, i) => {
      const got = frame(longRoot, text, i + 1);
      expect(got.length).toBeGreaterThan(0);
      expect(got.length).toBeLessThan(PART_BUDGET);
    });
  });

  test("resolves every <plugin-root> to the plugin folder", () => {
    const all = parts(text)
      .map((_, i) => frame("/opt/companion", text, i + 1))
      .join("\n");
    expect(all).not.toContain("<plugin-root>");
    expect(all).toContain("python3 /opt/companion/scripts/sessions.py");
    expect(all).toContain("python3 /opt/companion/scripts/watch.py");
    expect(all).toContain("python3 /opt/companion/scripts/merge_gate.py");
  });

  test("the parts carry the whole frame: the merge and security rules are in it", () => {
    const all = parts(text).join("\n");
    expect(all).toContain("## Merging on her word");
    expect(all).toContain("## Security");
    expect(frame("/x", text, 99)).toBe("");
  });

  test("prints SessionStart additionalContext", () => {
    const parsed = JSON.parse(output("hello"));
    expect(parsed).toEqual({
      hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: "hello" },
    });
  });

  test("prints nothing outside the channel session", () => {
    // Run from a plain shell: no claude ancestor names the channel.
    const proc = Bun.spawnSync(["bun", join(root, "hooks", "session-start.ts"), "1"], {
      env: { ...process.env, CLAUDE_PLUGIN_ROOT: root },
    });
    expect(proc.exitCode).toBe(0);
    expect(proc.stdout.toString()).toBe("");
  });
});
