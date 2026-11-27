#!/usr/bin/env bun
/**
 * Keeps every skill lean. A SKILL.md loads whole into context the moment its skill runs and
 * stays there for the session; after a compaction Claude Code re-attaches only the first
 * 5,000 tokens of each invoked skill, inside 25,000 tokens shared by all of them
 * (https://code.claude.com/docs/en/skills, "Skill content lifecycle"). The detail a step
 * needs belongs in the skill's `references/`, read at that step, so SKILL.md stays an
 * outline with pointers ("Add supporting files" on the same page, and "Progressive
 * disclosure patterns" in
 * https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices).
 *
 * Two checks per skill, on the body (what follows the frontmatter, the part that loads):
 *
 * - The body stays within MAX_LINES lines and MAX_CHARS characters. The documented ceiling is
 *   500 lines; this repo's lines run long, so the character budget is the binding one: at
 *   about four characters a token, 12,000 characters is about 3,000 tokens, well inside the
 *   5,000-token cut, and lets the skills of a normal run (go, clarify, review, ship and a
 *   situational one or two) all survive a compaction whole inside the shared 25,000.
 * - Every file the body names exists. A bare `references/x.md`, `scripts/x.py` or
 *   `playbooks/x.md` is the skill's own; `<plugin-root>/...` is the plugin's. A path with a
 *   `*` in it is a pattern and is not checked.
 *
 * Usage:
 *   bun validate-skill-size.ts
 */

import { existsSync } from "fs";
import { readFile } from "fs/promises";
import { basename, dirname, join, resolve } from "path";

import {
  type FileIssues,
  type ValidationIssue,
  bodyOf,
  lineOf,
  reportAndExit,
  runMain,
  walkFiles,
} from "./lib/validate-common";

const PLUGIN_DIR = resolve(import.meta.dir, "..", "..", "plugins", "ss");
const SKILLS_DIR = join(PLUGIN_DIR, "skills");

export const MAX_LINES = 150;
export const MAX_CHARS = 12_000;

/**
 * Skills both checks skip, each with the reason, which is printed on every run. An entry
 * whose skill is gone is a warning, so it gets removed without failing the PR that removed
 * the skill.
 */
export const EXEMPT: Record<string, string> = {
  assistant: "PR #41 removes this skill; drop this entry when it lands",
};

const PLUGIN_ROOT = "<plugin-root>/";

/**
 * A path a skill names: a bare one under the skill's own folders, or one under the plugin
 * root. The lookbehind keeps `skills/ship/references/x.md` from also matching as a bare
 * `references/x.md`.
 */
const PATH_REGEX =
  /(?<![\w./-])(<plugin-root>\/(?:skills|references|scripts|agents|hooks)\/[\w.*/-]+|(?:references|scripts|playbooks)\/[\w.*/-]+)/g;

export interface NamedPath {
  /** The path as the body writes it, trailing punctuation dropped. */
  text: string;
  /** The file it resolves to. */
  resolved: string;
  index: number;
}

function error(message: string): ValidationIssue {
  return { level: "error", message };
}

export function measure(body: string): { lines: number; chars: number } {
  const trimmed = body.replace(/\s+$/, "");
  return {
    lines: trimmed === "" ? 0 : trimmed.split(/\r?\n/).length,
    chars: [...trimmed].length,
  };
}

/** Every checkable path the body names, resolved against the skill or the plugin root. */
export function namedPaths(body: string, skillDir: string, pluginDir: string): NamedPath[] {
  const found: NamedPath[] = [];
  for (const match of body.matchAll(PATH_REGEX)) {
    // A placeholder (`references/<topic>.md`, `{name}`) names no file of its own.
    const next = body[(match.index ?? 0) + match[1].length];
    if (next === "<" || next === "{") continue;
    // Trailing emphasis or punctuation is not part of the path; a `*` left inside is a glob.
    const text = match[1].replace(/[*./-]+$/, "");
    if (text.includes("*")) continue;
    const resolved = text.startsWith(PLUGIN_ROOT)
      ? join(pluginDir, text.slice(PLUGIN_ROOT.length))
      : join(skillDir, text);
    found.push({ text, resolved, index: match.index ?? 0 });
  }
  return found;
}

/** The issues of one skill. `exists` is injectable so the test needs no files on disk. */
export function checkSkill(
  name: string,
  markdown: string,
  skillDir: string,
  pluginDir: string,
  exists: (path: string) => boolean = existsSync,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const body = bodyOf(markdown);
  const offset = markdown.length - body.length;
  const { lines, chars } = measure(body);

  if (Object.hasOwn(EXEMPT, name)) {
    const size = `${lines} lines, ${chars} chars`;
    return [{ level: "warning", message: `not checked (${size}): ${EXEMPT[name]}` }];
  }

  const move = "move the detail to references/ and point to it from the step that needs it";
  if (lines > MAX_LINES) {
    issues.push(error(`body is ${lines} lines, over the ${MAX_LINES} limit: ${move}`));
  }
  if (chars > MAX_CHARS) {
    issues.push(error(`body is ${chars} characters, over the ${MAX_CHARS} limit: ${move}`));
  }

  const seen = new Set<string>();
  for (const path of namedPaths(body, skillDir, pluginDir)) {
    if (seen.has(path.text) || exists(path.resolved)) continue;
    seen.add(path.text);
    const line = lineOf(markdown, offset + path.index);
    issues.push(error(`line ${line}: \`${path.text}\` names a file that does not exist`));
  }

  return issues;
}

/** A skill is `skills/<name>/SKILL.md`; a SKILL.md nested deeper belongs to no skill. */
function isSkillFile(filePath: string): boolean {
  return basename(filePath) === "SKILL.md" && dirname(dirname(filePath)) === SKILLS_DIR;
}

async function main() {
  const files = await walkFiles(SKILLS_DIR, isSkillFile);
  console.log(
    `Validating ${files.length} skills: body within ${MAX_LINES} lines and ${MAX_CHARS} characters, every named file present...\n`,
  );

  const reports: FileIssues[] = [];
  const names = new Set<string>();
  for (const file of files) {
    const skillDir = dirname(file);
    const name = basename(skillDir);
    names.add(name);
    const markdown = await readFile(file, "utf-8");
    reports.push({ path: file, issues: checkSkill(name, markdown, skillDir, PLUGIN_DIR) });
  }

  const notes: ValidationIssue[] = Object.keys(EXEMPT)
    .filter((name) => !names.has(name))
    .map((name) => ({
      level: "warning",
      message: `EXEMPT names \`${name}\`, which is no longer a skill: remove the entry`,
    }));

  reportAndExit(PLUGIN_DIR, reports, notes, "skills");
}

if (import.meta.main) runMain(main);
