#!/usr/bin/env bun
/**
 * Validates the trigger table against the skills it points at. An agent learns which
 * situational skills exist only from `references/triggers.md`, so a skill with no row is
 * never loaded, and a row with no skill sends the agent to a file that is not there.
 *
 * A skill is situational when its frontmatter carries `metadata.kind: situational`. The flag
 * that hides a skill from the slash menu cannot be the marker: `correct` is situational and
 * stays in the menu as `/ss:correct`.
 *
 * Usage:
 *   bun validate-triggers.ts
 */

import { readFile } from "fs/promises";
import { basename, dirname, join, resolve } from "path";

import {
  type FileIssues,
  type ValidationIssue,
  parseFrontmatter,
  reportAndExit,
  runMain,
  walkFiles,
} from "./lib/validate-common";

const PLUGIN_DIR = resolve(import.meta.dir, "..", "..", "plugins", "ss");
const SKILLS_DIR = join(PLUGIN_DIR, "skills");
const TRIGGERS_FILE = join(PLUGIN_DIR, "references", "triggers.md");

/** Only the table under this heading is read: the page may hold other tables as prose. */
const TABLE_HEADING = "## The table";
const SITUATIONAL_KIND = "situational";

interface Skill {
  file: string;
  situational: boolean;
}

interface Row {
  skill: string;
  path: string;
  line: number;
}

function error(message: string): ValidationIssue {
  return { level: "error", message };
}

/** A skill is `skills/<name>/SKILL.md`; a SKILL.md nested deeper belongs to no skill. */
function isSkillFile(filePath: string): boolean {
  return basename(filePath) === "SKILL.md" && dirname(dirname(filePath)) === SKILLS_DIR;
}

function isSituational(markdown: string): boolean {
  const metadata = parseFrontmatter(markdown).frontmatter["metadata"];
  if (!metadata || typeof metadata !== "object") return false;
  return (metadata as Record<string, unknown>)["kind"] === SITUATIONAL_KIND;
}

/** Every skill, keyed by its directory name, which is the name a row and its path use. */
async function readSkills(): Promise<Map<string, Skill>> {
  const skills = new Map<string, Skill>();
  for (const file of await walkFiles(SKILLS_DIR, isSkillFile)) {
    const situational = isSituational(await readFile(file, "utf-8"));
    skills.set(basename(dirname(file)), { file, situational });
  }
  return skills;
}

/** A table line's cells, trimmed, with the backticks around a whole cell dropped. */
function cellsOf(line: string): string[] {
  const inner = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return inner.split("|").map((cell) => cell.trim().replace(/^`(.*)`$/, "$1"));
}

/** The table's rows, with the columns found by the `skill` and `path` header cells. */
function readRows(markdown: string): { rows: Row[]; issues: ValidationIssue[] } {
  const lines = markdown.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === TABLE_HEADING);
  if (start === -1) return { rows: [], issues: [error(`No "${TABLE_HEADING}" section`)] };

  const table: { text: string; line: number }[] = [];
  for (const [i, text] of lines.slice(start + 1).entries()) {
    if (text.startsWith("## ")) break;
    if (text.trim().startsWith("|")) table.push({ text, line: start + i + 2 });
  }

  const [header, , ...body] = table;
  if (!header) return { rows: [], issues: [error(`"${TABLE_HEADING}" holds no table`)] };

  const columns = cellsOf(header.text);
  const skillColumn = columns.indexOf("skill");
  const pathColumn = columns.indexOf("path");
  if (skillColumn === -1 || pathColumn === -1) {
    return { rows: [], issues: [error('The table needs a "skill" and a "path" column')] };
  }

  const rows = body.map(({ text, line }) => {
    const cells = cellsOf(text);
    return { skill: cells[skillColumn] ?? "", path: cells[pathColumn] ?? "", line };
  });
  return { rows, issues: [] };
}

async function main() {
  const markdown = await readFile(TRIGGERS_FILE, "utf-8").catch(() => null);
  if (markdown === null) {
    reportAndExit(PLUGIN_DIR, [], [error(`${TRIGGERS_FILE}: no such file`)], "files");
    return;
  }

  const skills = await readSkills();
  const { rows, issues } = readRows(markdown);
  const situational = [...skills].filter(([, skill]) => skill.situational);

  const counted = `${rows.length} rows against ${situational.length} situational skills`;
  console.log(`Validating references/triggers.md: ${counted}...\n`);

  const named = new Set<string>();
  for (const row of rows) {
    const where = `Row \`${row.skill}\` (line ${row.line})`;
    const skill = skills.get(row.skill);
    const expected = `<plugin-root>/skills/${row.skill}/SKILL.md`;

    if (named.has(row.skill)) issues.push(error(`${where}: a second row for the same skill`));
    named.add(row.skill);

    if (!skill) {
      issues.push(error(`${where}: names a skill that does not exist, no skills/${row.skill}/`));
    } else if (!skill.situational) {
      issues.push(error(`${where}: the skill lacks \`metadata.kind: situational\``));
    }

    if (row.path !== expected) {
      issues.push(error(`${where}: the path should be \`${expected}\`, the agent reads it`));
    }
  }

  const reports: FileIssues[] = [{ path: TRIGGERS_FILE, issues }];
  for (const [name, skill] of situational) {
    const message = `No row in references/triggers.md for \`${name}\``;
    reports.push({ path: skill.file, issues: named.has(name) ? [] : [error(message)] });
  }

  reportAndExit(PLUGIN_DIR, reports, [], "files");
}

runMain(main);
