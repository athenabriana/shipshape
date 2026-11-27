/**
 * What the companion's agent may do on its own, what it may never do, and what it asks
 * Athena about first.
 *
 * Part of the companion plugin, Apache License, Version 2.0 (see LICENSE and NOTICE).
 *
 * `decide()` is one pure function over a tool call: allow, deny, ask, or merge (a
 * `gh pr merge` in the exact form `merge_gate.py` prints, which `agent.ts` checks against
 * the review gate before it even asks). The service runs it twice: in a `PreToolUse` hook,
 * which sees every call whatever the permission mode, and again in `canUseTool`, which
 * sends the Telegram button for an ask. `staticDenyRules()` repeats the secret paths as
 * Claude Code deny rules, so the CLI's own matcher refuses them too, for `Grep` and `Glob`
 * over a folder as well.
 *
 * - Allowed: reading under her repositories, the plugin and the companion's own folders;
 *   read-only `git` and `gh` commands; `sessions.py` and `merge_gate.py`; the companion's
 *   own Telegram tools; `SendMessage` and `ListAgents`; writes inside the memory folder.
 * - Denied: credential and secret reads (the state folder with the tokens, `.env` files,
 *   SSH, cloud and `gh` credentials, Claude's own, session keys, transcripts read raw, the
 *   process environment); `gh api` mutations; `gh auth`; approving a review; force pushes
 *   and every other git write; `--admin` and `--auto` merges; deploys; file writes outside
 *   the memory folder, a shell redirect included.
 * - Everything else asks.
 */

import { existsSync, realpathSync } from "fs";
import { basename, dirname, isAbsolute, join, resolve, sep } from "path";

export type Paths = {
  home: string;
  /** The token, access.json, sessions.json: never read by the agent, except `inbox/`. */
  stateDir: string;
  /** The agent's working folder, with `memory/` in it: the only place it writes. */
  dataDir: string;
  /** This plugin's folder, for `scripts/sessions.py` and `scripts/merge_gate.py`. */
  pluginRoot: string;
  /** Where her repositories live, read without asking. */
  readRoots: string[];
};

export type Decision =
  | { kind: "allow" }
  | { kind: "deny"; reason: string }
  | { kind: "ask"; reason: string }
  | { kind: "merge"; repo: string; number: number; method: string; head: string; command: string };

const allow: Decision = { kind: "allow" };
const deny = (reason: string): Decision => ({ kind: "deny", reason });
const ask = (reason: string): Decision => ({ kind: "ask", reason });

/** The companion's own in-process Telegram tools (agent.ts names the server `telegram`). */
export const TELEGRAM_TOOL_PREFIX = "mcp__telegram__";

/** Tools that read and change nothing outside the session itself. */
const HARMLESS_TOOLS = new Set([
  "SendMessage",
  "ListAgents",
  "TodoWrite",
  "ToolSearch",
  "TaskCreate",
  "TaskUpdate",
  "TaskList",
  "TaskGet",
]);

/** Tools the service turns off: a dialog nobody sees, schedulers the service replaces, sub-agents. */
export const DISALLOWED_TOOLS = [
  "AskUserQuestion",
  "Agent",
  "Task",
  "Monitor",
  "CronCreate",
  "CronDelete",
  "ScheduleWakeup",
  "RemoteTrigger",
  "EnterWorktree",
  "ExitWorktree",
  "EnterPlanMode",
  "ExitPlanMode",
  "NotebookEdit",
  "Skill",
];

const WRITE_TOOLS = new Set(["Write", "Edit", "MultiEdit", "NotebookEdit"]);

// ---------------------------------------------------------------- paths

/** `~` expanded, relative paths taken from the working folder, symlinks resolved where they exist. */
export function resolvePath(p: string, paths: Paths): string {
  const expanded = p === "~" ? paths.home : p.startsWith("~/") ? join(paths.home, p.slice(2)) : p;
  const abs = isAbsolute(expanded) ? resolve(expanded) : resolve(paths.dataDir, expanded);
  return realish(abs);
}

/** The real path of the nearest existing ancestor, with the rest appended. */
function realish(abs: string): string {
  let head = abs;
  const tail: string[] = [];
  while (!existsSync(head)) {
    const up = dirname(head);
    if (up === head) return abs;
    tail.unshift(basename(head));
    head = up;
  }
  try {
    return join(realpathSync(head), ...tail);
  } catch {
    return abs;
  }
}

export function inside(child: string, parent: string): boolean {
  const p = realish(resolve(parent));
  return child === p || child.startsWith(p.endsWith(sep) ? p : p + sep);
}

/** Folders under the home folder that hold credentials. */
const SECRET_HOME_DIRS = [
  ".ssh",
  ".aws",
  ".gnupg",
  ".kube",
  ".azure",
  ".password-store",
  ".config/gh",
  ".config/gcloud",
  ".config/op",
  ".config/hub",
  ".local/share/keyrings",
  ".claude/projects", // raw transcripts: sessions.py reads them, masked
];
const SECRET_HOME_FILES = [
  ".netrc",
  ".git-credentials",
  ".npmrc",
  ".pypirc",
  ".claude.json",
  ".claude/.credentials.json",
  ".docker/config.json",
];
const SECRET_NAME =
  /^(\.env(\..*)?|\.envrc|.*\.(pem|key|p12|pfx|keystore|jks)|id_(rsa|dsa|ecdsa|ed25519)(\.pub)?|credentials(\.json)?|.*secrets?\.(json|ya?ml|toml))$/i;

/** True when a resolved path holds, or may hold, a credential. */
export function isSecretPath(abs: string, paths: Paths): boolean {
  if (abs === "/proc" || abs.startsWith("/proc/")) return true;
  if (inside(abs, paths.stateDir) && !inside(abs, join(paths.stateDir, "inbox"))) return true;
  for (const d of SECRET_HOME_DIRS) if (inside(abs, join(paths.home, d))) return true;
  for (const f of SECRET_HOME_FILES) if (abs === realish(join(paths.home, f))) return true;
  if (inside(abs, join(paths.home, ".claude", "sessions")) && abs.endsWith(".key")) return true;
  return SECRET_NAME.test(basename(abs));
}

function readable(abs: string, paths: Paths): boolean {
  return [
    paths.dataDir,
    paths.pluginRoot,
    join(paths.stateDir, "inbox"),
    ...paths.readRoots,
  ].some((root) => inside(abs, root));
}

/** The deny rules Claude Code applies itself: a `Grep` over a folder skips these files too. */
export function staticDenyRules(paths: Paths): string[] {
  const abs = (p: string) => `/${p}`; // `//` starts an absolute path in a rule
  const rules: string[] = [];
  for (const tool of ["Read", "Edit"]) {
    rules.push(`${tool}(${abs(paths.stateDir)}/.env)`, `${tool}(${abs(paths.stateDir)}/*.json)`);
    for (const d of SECRET_HOME_DIRS) rules.push(`${tool}(${abs(join(paths.home, d))}/**)`);
    for (const f of SECRET_HOME_FILES) rules.push(`${tool}(${abs(join(paths.home, f))})`);
    rules.push(
      `${tool}(${abs(join(paths.home, ".claude", "sessions"))}/*.key)`,
      `${tool}(**/.env)`,
      `${tool}(**/.env.*)`,
      `${tool}(**/*.pem)`,
      `${tool}(**/*.key)`,
      `${tool}(//proc/**)`,
    );
  }
  return rules;
}

// ---------------------------------------------------------------- shell

/**
 * A command line split into words, or null when it holds anything a plain split cannot
 * vouch for: a pipe, a chain, a substitution, a variable, a glob, a redirect left after
 * the harmless ones are taken out.
 */
export function shellWords(command: string): string[] | null {
  const words: string[] = [];
  let word = "";
  let inWord = false;
  let quote: '"' | "'" | null = null;
  for (let i = 0; i < command.length; i++) {
    const c = command[i];
    if (quote === "'") {
      if (c === "'") quote = null;
      else word += c;
      continue;
    }
    if (quote === '"') {
      if (c === '"') quote = null;
      else if (c === "$" || c === "`" || c === "\\") return null;
      else word += c;
      continue;
    }
    if (c === "'" || c === '"') {
      quote = c;
      inWord = true;
      continue;
    }
    if (c === " " || c === "\t") {
      if (inWord) words.push(word);
      word = "";
      inWord = false;
      continue;
    }
    if (/[;&|<>`$(){}\[\]*?!\\\n\r#]/.test(c)) return null;
    word += c;
    inWord = true;
  }
  if (quote) return null;
  if (inWord) words.push(word);
  return words;
}

/** Redirects that write nothing: to /dev/null, or stderr onto stdout. */
const HARMLESS_REDIRECTS = /(^|\s)(\d?>\s*\/dev\/null|&>\s*\/dev\/null|2>&1)(?=\s|$)/g;

const SECRET_WORDS =
  /(^|[\s'"=:/])(\.env(\.\w+)?|\.envrc|\.netrc|\.git-credentials|\.npmrc|\.pypirc|\.claude\.json|\.credentials\.json|id_(rsa|dsa|ecdsa|ed25519)|environ|printenv)(?=$|[\s'"/;|&)])/;

/** Paths and names in a raw command that point at a credential, before any parsing. */
export function mentionsSecret(command: string, paths: Paths): boolean {
  if (SECRET_WORDS.test(command)) return true;
  const named = [
    paths.stateDir,
    "companion-telegram",
    "/proc/",
    ...SECRET_HOME_DIRS.map((d) => `/${d}`),
    ...SECRET_HOME_DIRS.map((d) => `~/${d}`),
    ".claude/sessions",
  ];
  const inbox = join(paths.stateDir, "inbox");
  const withoutInbox = command.split(inbox).join("");
  return named.some((n) => withoutInbox.includes(n));
}

const ENV_DUMPERS = new Set(["env", "printenv", "set", "export", "declare", "typeset", "compgen"]);
const FILE_WRITERS = new Set([
  "rm",
  "rmdir",
  "mv",
  "cp",
  "mkdir",
  "touch",
  "chmod",
  "chown",
  "chgrp",
  "ln",
  "tee",
  "dd",
  "truncate",
  "shred",
  "install",
  "unlink",
  "sudo",
  "su",
  "doas",
]);
const GIT_READS = new Set([
  "log",
  "status",
  "diff",
  "show",
  "rev-parse",
  "ls-files",
  "blame",
  "shortlog",
  "describe",
  "merge-base",
  "rev-list",
  "cat-file",
]);
const GIT_BAD_ARGS = /^(-c|--config-env|--output|--exec-path|--upload-pack|--receive-pack|--ext-diff)(=|$)/;
const GH_READS: Record<string, Set<string>> = {
  pr: new Set(["view", "list", "checks", "diff", "status"]),
  run: new Set(["view", "list"]),
  search: new Set(["prs", "issues", "repos", "commits", "code"]),
  issue: new Set(["view", "list", "status"]),
  repo: new Set(["view", "list"]),
  release: new Set(["view", "list"]),
  workflow: new Set(["view", "list"]),
};
const READ_COMMANDS = new Set([
  "ls",
  "cat",
  "head",
  "tail",
  "wc",
  "grep",
  "rg",
  "stat",
  "file",
  "find",
]);
const FIND_ACTIONS = /^-(exec|execdir|ok|okdir|delete|fprint|fprint0|fprintf|fls)$/;

const MERGE_FORM =
  "a merge runs only as the merge_command merge_gate.py printed, exactly: gh pr merge N --repo OWNER/REPO --squash --match-head-commit SHA";
const MERGE_SHAPE =
  /^gh pr merge (\d+) --repo ([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+) (--squash|--merge|--rebase) --match-head-commit ([0-9a-f]{40})$/;

/** `gh api`: reads only. GraphQL without a mutation; REST with no body and no other method. */
function ghApi(words: string[]): Decision {
  const args = words.slice(2);
  const endpoint = args.find((a) => !a.startsWith("-"));
  if (endpoint === "graphql") {
    const query = args.join(" ");
    return /\bmutation\b/i.test(query)
      ? deny("gh api mutations are not the companion's to run")
      : allow;
  }
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (/^(-f|-F|--field|--raw-field|--input)(=|$)/.test(a) || /^-[fF]./.test(a))
      return deny("gh api mutations are not the companion's to run");
    if (a === "-X" || a === "--method") {
      if ((args[i + 1] ?? "").toUpperCase() !== "GET")
        return deny("gh api mutations are not the companion's to run");
    }
    if (/^(-X|--method=)(.+)$/.test(a) && !/^(-X|--method=)GET$/i.test(a))
      return deny("gh api mutations are not the companion's to run");
  }
  return allow;
}

function pathArgsReadable(args: string[], paths: Paths): boolean {
  return args
    .filter((a) => !a.startsWith("-"))
    .every((a) => {
      const abs = resolvePath(a, paths);
      return readable(abs, paths) && !isSecretPath(abs, paths);
    });
}

export function decideBash(raw: string, paths: Paths): Decision {
  const command = raw.trim();
  if (!command) return deny("an empty command");

  // What is refused whatever its shape: a pipe cannot launder any of it. Quoted text (a
  // search phrase, a message) is left out of the word checks, never out of the secret one.
  const outsideQuotes = command.replace(/'[^']*'/g, "''").replace(/"[^"]*"/g, '""');
  if (mentionsSecret(command, paths))
    return deny("credentials and secrets are never read or sent");
  if (/\bdeploy\b/i.test(outsideQuotes)) return deny("deploys are Athena's to run, never the companion's");
  if (/\bgh\s+auth\b/.test(command)) return deny("gh's credentials are not the companion's to read");
  if (/\bgh\s+pr\s+merge\b/.test(command) && /--admin\b|--auto\b/.test(command))
    return deny("a merge never goes around the rules: no --admin, no --auto");
  if (/\bgh\s+pr\s+merge\b/.test(outsideQuotes)) {
    // Nothing chained, piped or added: the whole command is the gate's merge_command.
    const m = MERGE_SHAPE.exec(command);
    if (!m) return deny(MERGE_FORM);
    return { kind: "merge", number: Number(m[1]), repo: m[2], method: m[3], head: m[4], command };
  }
  if (/\bgh\s+pr\s+review\b/.test(command) && /(--approve\b|\s-a\b)/.test(command))
    return deny("approving a review is never the companion's to do");
  if (/\bgh\s+repo\s+(delete|archive|rename|edit)\b/.test(command))
    return deny("repository settings are not the companion's to change");
  if (/\bgit\b[\s\S]*\bpush\b/.test(outsideQuotes)) {
    if (/(\s-[A-Za-z]*f[A-Za-z]*\b|--force|\s\+\S)/.test(outsideQuotes))
      return deny("a force push is never the companion's to do");
    return deny("pushing is the work session's job: the companion writes no code");
  }
  if (/\bgh\s+api\b/.test(outsideQuotes)) {
    if (/graphql/.test(command) && /\bmutation\b/i.test(command))
      return deny("gh api mutations are not the companion's to run");
    if (/(\s(-f|-F|--field|--raw-field|--input)(\s|=))|\s-X\s*(?!GET\b)\S|--method[\s=](?!GET\b)/i.test(outsideQuotes) && !/graphql/.test(command))
      return deny("gh api mutations are not the companion's to run");
  }
  const stripped = command.replace(HARMLESS_REDIRECTS, " ").trim();
  if (/>/.test(stripped.replace(/'[^']*'/g, "''").replace(/"[^"]*"/g, '""')))
    return deny("writing files from the shell is not the companion's: it writes only its memory");

  const words = shellWords(stripped);
  if (!words || words.length === 0) return ask("a command a plain split cannot vouch for");
  const [cmd, ...args] = words;
  if (/^\w+=/.test(cmd)) return ask("a command that sets variables");
  if (ENV_DUMPERS.has(cmd)) return deny("the environment holds credentials and is never printed");
  if (FILE_WRITERS.has(cmd)) return deny("the companion writes only its memory folder, with Write and Edit");
  if ((cmd === "sed" || cmd === "perl") && args.some((a) => /^-[a-zA-Z]*i/.test(a)))
    return deny("the companion writes only its memory folder, with Write and Edit");

  if (cmd === "git") {
    let i = 0;
    while (i < args.length && (args[i] === "-C" || args[i] === "--no-pager")) i += args[i] === "-C" ? 2 : 1;
    const sub = args[i];
    const rest = args.slice(i + 1);
    if (args.some((a) => GIT_BAD_ARGS.test(a))) return deny("git options that run or write things are refused");
    if (sub && GIT_READS.has(sub)) return allow;
    if (sub === "branch" && rest.every((a) => /^(-a|-r|-v|-vv|--list|--show-current|--all|--remotes|--contains|--merged|--no-merged|[0-9a-f]{7,40})$/.test(a)))
      return allow;
    if (sub === "remote" && (rest.length === 0 || rest[0] === "-v" || rest[0] === "get-url")) return allow;
    return deny("git commands that change a repository are not the companion's: it writes no code");
  }

  if (cmd === "gh") {
    const [group, sub] = args;
    if (group === "api") return ghApi(words);
    if (group === "pr" && sub === "merge") {
      const m = MERGE_SHAPE.exec(words.join(" "));
      if (!m) return deny(MERGE_FORM);
      return { kind: "merge", number: Number(m[1]), repo: m[2], method: m[3], head: m[4], command: words.join(" ") };
    }
    if (group && sub && GH_READS[group]?.has(sub)) {
      if (args.some((a) => a === "--web" || a === "-w")) return ask("opening a browser");
      return allow;
    }
    return ask("a gh command that may change something");
  }

  if (cmd === "python3" || cmd === "python") {
    const script = args[0] ? resolvePath(args[0], paths) : "";
    const scripts = join(realish(resolve(paths.pluginRoot)), "scripts");
    if (script === join(scripts, "sessions.py") || script === join(scripts, "merge_gate.py")) return allow;
    if (script === join(scripts, "watch.py")) return deny("the service runs the watch itself");
    return ask("a script");
  }

  if (cmd === "pwd" || cmd === "date" || cmd === "whoami" || cmd === "echo") return allow;
  if (READ_COMMANDS.has(cmd)) {
    if (cmd === "find" && args.some((a) => FIND_ACTIONS.test(a))) return ask("find with an action");
    if (cmd === "ls" && args.length === 0) return allow;
    return pathArgsReadable(args, paths) ? allow : ask("reading outside her repositories");
  }
  return ask("a command outside the companion's read-only list");
}

// ---------------------------------------------------------------- every tool

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export function decide(toolName: string, input: Record<string, unknown>, paths: Paths): Decision {
  if (toolName.startsWith(TELEGRAM_TOOL_PREFIX)) return allow;
  if (HARMLESS_TOOLS.has(toolName)) return allow;
  if (DISALLOWED_TOOLS.includes(toolName)) return deny(`${toolName} is off in the companion`);

  if (toolName === "Read" || toolName === "Grep" || toolName === "Glob" || toolName === "LS") {
    const raw = str(input.file_path) || str(input.path) || paths.dataDir;
    const abs = resolvePath(raw, paths);
    if (isSecretPath(abs, paths)) return deny("credentials and secrets are never read or sent");
    const pattern = str(input.pattern);
    if (toolName === "Glob" && (isAbsolute(pattern) || pattern.startsWith("~"))) {
      const fixed = pattern.split(/[*?[{]/)[0];
      const fixedAbs = resolvePath(fixed || "/", paths);
      if (isSecretPath(fixedAbs, paths)) return deny("credentials and secrets are never read or sent");
      if (!readable(fixedAbs, paths)) return ask("reading outside her repositories");
    }
    if (toolName === "Grep" && str(input.glob) && /\.env|\.pem|\.key|credentials/i.test(str(input.glob)))
      return deny("credentials and secrets are never read or sent");
    return readable(abs, paths) ? allow : ask("reading outside her repositories");
  }

  if (WRITE_TOOLS.has(toolName)) {
    const target = str(input.file_path) || str(input.notebook_path);
    if (!target) return deny("a write with no path");
    const abs = resolvePath(target, paths);
    if (inside(abs, join(paths.dataDir, "memory")) && !isSecretPath(abs, paths)) return allow;
    return deny("the companion writes only its memory folder");
  }

  if (toolName === "Bash") return decideBash(str(input.command), paths);
  if (toolName === "BashOutput" || toolName === "KillShell" || toolName === "KillBash") return allow;
  if (toolName === "WebFetch" || toolName === "WebSearch") return ask("reaching the web");
  return ask(`a tool outside the companion's list (${toolName})`);
}
