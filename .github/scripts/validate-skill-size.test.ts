import { describe, expect, test } from "bun:test";

import { MAX_CHARS, MAX_LINES, checkSkill, measure, namedPaths } from "./validate-skill-size";

const SKILL_DIR = "/p/skills/demo";
const PLUGIN_DIR = "/p";

function skill(body: string): string {
  return `---\nname: demo\ndescription: names references/not-checked.md here\n---\n${body}`;
}

function errorsOf(markdown: string, files: string[] = [], name = "demo"): string[] {
  const exists = (path: string) => files.includes(path);
  return checkSkill(name, markdown, SKILL_DIR, PLUGIN_DIR, exists)
    .filter((issue) => issue.level === "error")
    .map((issue) => issue.message);
}

describe("size", () => {
  test("a body at the line limit passes, one line more fails", () => {
    expect(errorsOf(skill("x\n".repeat(MAX_LINES)))).toEqual([]);
    const [message] = errorsOf(skill("x\n".repeat(MAX_LINES + 1)));
    expect(message).toContain(`${MAX_LINES + 1} lines`);
  });

  test("a body over the character limit fails even on few lines", () => {
    const [message] = errorsOf(skill("y".repeat(MAX_CHARS + 1)));
    expect(message).toContain(`${MAX_CHARS + 1} characters`);
  });

  test("the frontmatter does not count", () => {
    const long = `---\nname: demo\ndescription: ${"z".repeat(MAX_CHARS)}\n---\nshort\n`;
    expect(errorsOf(long)).toEqual([]);
  });

  test("trailing blank lines do not count", () => {
    expect(measure("a\nb\n\n\n")).toEqual({ lines: 2, chars: 3 });
  });

  test("an exempt skill gets one warning, not an error", () => {
    const body = "x\n".repeat(MAX_LINES) + "see references/gone.md\n";
    const exempt = { demo: "a reason" };
    const issues = checkSkill("demo", skill(body), SKILL_DIR, PLUGIN_DIR, () => false, exempt);
    expect(issues.map((issue) => issue.level)).toEqual(["warning"]);
    expect(issues[0].message).toContain("a reason");
  });
});

describe("named files", () => {
  test("a bare path resolves in the skill, a <plugin-root> path in the plugin", () => {
    const body =
      "Read `references/a.md`, then `<plugin-root>/references/b.md` and `<plugin-root>/skills/ship/references/c.md`.";
    expect(namedPaths(body, SKILL_DIR, PLUGIN_DIR).map((path) => path.resolved)).toEqual([
      "/p/skills/demo/references/a.md",
      "/p/references/b.md",
      "/p/skills/ship/references/c.md",
    ]);
  });

  test("a missing file fails with its line, a present one passes", () => {
    const markdown = skill("one\nsee references/here.md and scripts/gone.py.\n");
    const errors = errorsOf(markdown, ["/p/skills/demo/references/here.md"]);
    expect(errors).toEqual(["line 6: `scripts/gone.py` names a file that does not exist"]);
  });

  test("a pattern with * is not checked, and the description is not read", () => {
    expect(errorsOf(skill("each `references/front-*.md` file\n"))).toEqual([]);
  });

  test("bold paths are checked, placeholders are not", () => {
    const body =
      "**references/bold.md** and `references/<topic>.md` and `<plugin-root>/skills/<name>/x.md`\n";
    expect(errorsOf(skill(body))).toEqual([
      "line 5: `references/bold.md` names a file that does not exist",
    ]);
  });

  test("a path inside another path is matched once, as the longer one", () => {
    const body = "`<plugin-root>/skills/review/references/front-a11y.md`";
    expect(namedPaths(body, SKILL_DIR, PLUGIN_DIR).map((path) => path.text)).toEqual([
      "<plugin-root>/skills/review/references/front-a11y.md",
    ]);
  });
});
