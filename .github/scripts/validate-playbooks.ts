#!/usr/bin/env bun
/**
 * Validates the router's playbooks against its table. `/ss:go` learns which playbooks exist
 * only from the table in `skills/go/SKILL.md`, so a playbook file with no row is never
 * picked, and a row with no file sends the router to a recipe that is not there.
 *
 * Every file under `skills/go/playbooks/` carries the three parts the router reads, each as
 * its own `##` section, once and in this order: `## Steps`, `## Route`, `## Endpoint`.
 *
 * The router's frontmatter `description` is what the agent reads to pick `/ss:go` at all, and
 * it lists the playbooks by name in "playbook (...)", so every row's playbook must be in that list.
 *
 * Usage:
 *   bun validate-playbooks.ts
 */

import { readFile } from "fs/promises";
import { basename, join, relative, resolve } from "path";

import {
  type FileIssues,
  type ValidationIssue,
  parseFrontmatter,
  reportAndExit,
  runMain,
  walkFiles,
} from "./lib/validate-common";

const PLUGIN_DIR = resolve(import.meta.dir, "..", "..", "plugins", "ss");
const GO_DIR = join(PLUGIN_DIR, "skills", "go");
const ROUTER_FILE = join(GO_DIR, "SKILL.md");
const PLAYBOOKS_DIR = join(GO_DIR, "playbooks");

/** Only the table under this heading is read: the skill holds other tables (the routes). */
const TABLE_HEADING = "## 1. Match a playbook";
const SECTIONS = ["## Steps", "## Route", "## Endpoint"];

interface Row {
  playbook: string;
  read: string;
  line: number;
}

function error(message: string): ValidationIssue {
  return { level: "error", message };
}

/** A table line's cells, trimmed, with the backticks around a whole cell dropped. */
function cellsOf(line: string): string[] {
  const inner = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return inner.split("|").map((cell) => cell.trim().replace(/^`(.*)`$/, "$1"));
}

/** The table's rows, with the columns found by the `playbook` and `Read` header cells. */
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

  const columns = cellsOf(header.text).map((cell) => cell.toLowerCase());
  const playbookColumn = columns.indexOf("playbook");
  const readColumn = columns.indexOf("read");
  if (playbookColumn === -1 || readColumn === -1) {
    return { rows: [], issues: [error('The table needs a "playbook" and a "Read" column')] };
  }

  const rows = body.map(({ text, line }) => {
    const cells = cellsOf(text);
    return { playbook: cells[playbookColumn] ?? "", read: cells[readColumn] ?? "", line };
  });
  return { rows, issues: [] };
}

/** The description's playbook list: the parentheses after "playbook (", e.g. "(investigate, bug-fix, ...)". */
const LIST_REGEX = /playbook \(([^)]*)\)/;

/**
 * Each row's playbook named in that list. A comma-separated item compares whole, so
 * `review` never passes on the strength of `review-setup`, and a trigger phrase elsewhere in
 * the description ("iterate on this") cannot stand in for the list entry.
 */
function descriptionIssues(markdown: string, rows: Row[]): ValidationIssue[] {
  const description = parseFrontmatter(markdown).frontmatter["description"];
  if (typeof description !== "string") return [error("The router has no description")];
  const list = description.match(LIST_REGEX);
  if (!list) return [error('The router description has no "playbook (...)" list')];
  const named = new Set(list[1]!.split(",").map((item) => item.trim()));
  const where = relative(PLUGIN_DIR, ROUTER_FILE);
  return rows
    .filter(({ playbook }) => !named.has(playbook))
    .map(({ playbook }) =>
      error(`The playbook list in the description of ${where} does not name \`${playbook}\``),
    );
}

/** The three sections, each once and in order, outside fenced code. */
function sectionIssues(markdown: string): ValidationIssue[] {
  const headings: string[] = [];
  let fenced = false;
  for (const line of markdown.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
    else if (!fenced && line.startsWith("## ")) headings.push(line.trim());
  }

  const issues: ValidationIssue[] = [];
  for (const section of SECTIONS) {
    const count = headings.filter((heading) => heading === section).length;
    if (count === 0) issues.push(error(`No "${section}" section`));
    if (count > 1) issues.push(error(`"${section}" appears ${count} times, once is the rule`));
  }

  const order = headings.filter((heading) => SECTIONS.includes(heading));
  if (issues.length === 0 && order.join("|") !== SECTIONS.join("|")) {
    issues.push(error(`The sections run ${order.join(", ")}; the order is ${SECTIONS.join(", ")}`));
  }
  return issues;
}

async function main() {
  const markdown = await readFile(ROUTER_FILE, "utf-8").catch(() => null);
  if (markdown === null) {
    reportAndExit(PLUGIN_DIR, [], [error(`${ROUTER_FILE}: no such file`)], "files");
    return;
  }

  const files = await walkFiles(PLAYBOOKS_DIR, (path) => path.endsWith(".md")).catch(() => []);
  const playbooks = new Map(files.map((file) => [basename(file, ".md"), file]));
  const { rows, issues } = readRows(markdown);

  console.log(`Validating skills/go: ${rows.length} rows against ${playbooks.size} playbooks...\n`);

  const named = new Set<string>();
  for (const row of rows) {
    const where = `Row \`${row.playbook}\` (line ${row.line})`;
    const expected = `playbooks/${row.playbook}.md`;

    if (named.has(row.playbook)) issues.push(error(`${where}: a second row for the same playbook`));
    named.add(row.playbook);

    if (!playbooks.has(row.playbook)) {
      issues.push(error(`${where}: names a playbook with no file, no ${expected}`));
    }
    if (row.read !== expected) {
      issues.push(error(`${where}: the Read cell should be \`${expected}\`, the router reads it`));
    }
  }

  issues.push(...descriptionIssues(markdown, rows));

  const reports: FileIssues[] = [{ path: ROUTER_FILE, issues }];
  for (const [name, file] of playbooks) {
    const fileIssues = sectionIssues(await readFile(file, "utf-8"));
    if (!named.has(name)) fileIssues.push(error(`No row in skills/go/SKILL.md for \`${name}\``));
    reports.push({ path: file, issues: fileIssues });
  }

  reportAndExit(PLUGIN_DIR, reports, [], "files");
}

runMain(main);
