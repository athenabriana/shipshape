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
 * Claude Code deny rules, written from the home folder, so the CLI's own matcher refuses
 * them too, inside a `Grep` over a folder as well.
 *
 * The rule for Bash is narrow on purpose: a command runs on its own only when it is one
 * plain read whose every argument this file understands (read-only `git` and `gh`, the
 * plugin's two scripts). A file read goes through `Read`, `Grep` and `Glob`, whose paths
 * are checked here and by the deny rules. Anything else asks, after the deny checks ran
 * over the whole text, so neither a pipe nor a nested shell launders what is refused.
 *
 * - Allowed: reading under her repositories, the plugin and the companion's own folders;
 *   read-only `git` and `gh` commands; `sessions.py` and `merge_gate.py`; the companion's
 *   own Telegram tools (a file attached only from where it may read); `SendMessage` and
 *   `ListAgents`; writes inside the memory folder.
 * - Denied: credential and secret reads (the state folder with the tokens, `.env` and other
 *   secret files, SSH, cloud and `gh` credentials, Claude's own, session keys, transcripts
 *   read raw, the process environment); `gh api` mutations; `gh auth`; approving a review;
 *   every git write, force pushes included; a merge in any form but the gate's, `--admin`
 *   and `--auto` included; deploys; nested shells and interpreters; file writes outside
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

export type MergeDecision = {
  kind: "merge";
  repo: string;
  number: number;
  method: string;
  head: string;
  command: string;
};

export type Decision =
  | { kind: "allow" }
  | { kind: "deny"; reason: string }
  | { kind: "ask"; reason: string }
  | MergeDecision;

const allow: Decision = { kind: "allow" };
const deny = (reason: string): Decision => ({ kind: "deny", reason });
const ask = (reason: string): Decision => ({ kind: "ask", reason });

const SECRET = "credentials and secrets are never read or sent";
const GH_MUTATION = "gh api mutations are not the companion's to run";
const NO_GIT_WRITE =
  "git commands that change a repository are not the companion's: it writes no code";
const MERGE_FORM =
  "a merge runs only as the merge_command merge_gate.py printed, exactly: gh pr merge N --repo OWNER/REPO --squash --match-head-commit SHA";

/** The companion's own in-process Telegram tools (agent.ts names the server `telegram`). */
export const TELEGRAM_TOOL_PREFIX = "mcp__telegram__";

/** The built-in tools the agent has at all (`tools` in agent.ts); every other one is absent. */
export const AGENT_TOOLS = [
  "Bash",
  "Read",
  "Grep",
  "Glob",
  "Write",
  "Edit",
  "WebFetch",
  "WebSearch",
  "SendMessage",
  "ListAgents",
  "TodoWrite",
  "ToolSearch",
];

/** Tools that read and change nothing outside the session itself. */
const HARMLESS_TOOLS = new Set(["SendMessage", "ListAgents", "TodoWrite", "ToolSearch"]);

/** Tools named off on top of `AGENT_TOOLS`, in case a build adds one back. */
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
  "Workflow",
  "PushNotification",
];

const WRITE_TOOLS = new Set(["Write", "Edit", "MultiEdit"]);

// ---------------------------------------------------------------- paths

/** `~` expanded, relative paths taken from `base` (the working folder), symlinks resolved. */
export function resolvePath(p: string, paths: Paths, base = paths.dataDir): string {
  const expanded = p === "~" ? paths.home : p.startsWith("~/") ? join(paths.home, p.slice(2)) : p;
  const abs = isAbsolute(expanded) ? resolve(expanded) : resolve(base, expanded);
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
const SECRET_HOME_FILES = [".claude.json", ".claude/.credentials.json", ".docker/config.json"];

/** File names that hold a credential wherever they sit, as globs for the deny rules. */
const SECRET_GLOBS = [
  ".env",
  ".env.*",
  ".envrc",
  ".netrc",
  ".npmrc",
  ".pypirc",
  ".git-credentials",
  "*.pem",
  "*.key",
  "*.p12",
  "*.pfx",
  "*.keystore",
  "*.jks",
  "id_rsa*",
  "id_dsa*",
  "id_ecdsa*",
  "id_ed25519*",
  "credentials",
  "credentials.json",
  "*secret*.json",
  "*secret*.yml",
  "*secret*.yaml",
  "*secret*.toml",
  ".git/config",
  ".dev.vars",
  "*.tfstate",
  "*.tfstate.*",
  "service-account*.json",
];
const SECRET_NAME =
  /^(\.env(\..*)?|\.envrc|\.netrc|\.npmrc|\.pypirc|\.git-credentials|.*\.(pem|key|p12|pfx|keystore|jks)|id_(rsa|dsa|ecdsa|ed25519).*|credentials(\.json)?|.*secrets?\.(json|ya?ml|toml)|\.dev\.vars|.*\.tfstate(\..*)?|service-account.*\.json)$/i;

/** True when a resolved path holds, or may hold, a credential. */
export function isSecretPath(abs: string, paths: Paths): boolean {
  if (abs === "/proc" || abs.startsWith("/proc/")) return true;
  if (inside(abs, paths.stateDir) && !inside(abs, join(paths.stateDir, "inbox"))) return true;
  for (const d of SECRET_HOME_DIRS) if (inside(abs, join(paths.home, d))) return true;
  for (const f of SECRET_HOME_FILES) if (abs === realish(join(paths.home, f))) return true;
  if (inside(abs, join(paths.home, ".claude", "sessions")) && abs.endsWith(".key")) return true;
  if (abs.endsWith(`${sep}.git${sep}config`)) return true; // a remote URL can carry a token
  return SECRET_NAME.test(basename(abs));
}

function readable(abs: string, paths: Paths): boolean {
  return [paths.dataDir, paths.pluginRoot, join(paths.stateDir, "inbox"), ...paths.readRoots].some(
    (root) => inside(abs, root),
  );
}

/** A glob or search filter that names a secret file. */
function namesSecret(glob: string): boolean {
  return /\.env|\.envrc|\.netrc|\.npmrc|\.pypirc|\.dev\.vars|tfstate|service-account|credential|secrets?\.|\.pem|\.key|\.p12|\.pfx|id_(rsa|dsa|ecdsa|ed25519)|\.git\/config/i.test(
    glob,
  );
}

/** A glob whose brackets, braces or `?` could spell a secret's name no list can read. */
function obscureGlob(glob: string): boolean {
  return /[[\]{}?]/.test(glob);
}

/**
 * The deny rules Claude Code applies itself. Each is written from the root folder (`//`),
 * since a rule without it is read from the session's working folder, which is not where
 * her repositories are.
 */
export function staticDenyRules(paths: Paths): string[] {
  const abs = (p: string) => `/${p}`; // `//` starts an absolute path in a rule
  const rules: string[] = [];
  for (const tool of ["Read", "Edit"]) {
    rules.push(`${tool}(${abs(paths.stateDir)}/.env)`, `${tool}(${abs(paths.stateDir)}/*.json)`);
    for (const d of SECRET_HOME_DIRS) rules.push(`${tool}(${abs(join(paths.home, d))}/**)`);
    for (const f of SECRET_HOME_FILES) rules.push(`${tool}(${abs(join(paths.home, f))})`);
    rules.push(
      `${tool}(${abs(join(paths.home, ".claude", "sessions"))}/*.key)`,
      `${tool}(//proc/**)`,
    );
    for (const g of SECRET_GLOBS) rules.push(`${tool}(${abs(paths.home)}/**/${g})`);
  }
  return rules;
}

// ---------------------------------------------------------------- shell

/**
 * A command line split into words, or null when it holds anything a plain split cannot
 * vouch for: a pipe, a chain, a substitution, a variable, a glob, a redirect left after
 * the harmless ones are taken out, or a `~` that names another user's home.
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
    // `~` expands only at a word's start; `~name` is another home, `~/` is hers.
    if (c === "~" && !inWord && command[i + 1] !== "/" && !/[\s]/.test(command[i + 1] ?? " "))
      return null;
    word += c;
    inWord = true;
  }
  if (quote) return null;
  if (inWord) words.push(word);
  return words;
}

/** The command with every quoted span blanked, scanned left to right as the shell reads it. */
export function unquoted(command: string): string {
  let out = "";
  let quote: '"' | "'" | null = null;
  for (const c of command) {
    if (quote) {
      if (c === quote) {
        quote = null;
        out += c;
      } else out += " ";
      continue;
    }
    if (c === "'" || c === '"') quote = c;
    out += c;
  }
  return out;
}

/** Redirects that write nothing: to /dev/null, or stderr onto stdout. */
const HARMLESS_REDIRECTS = /(^|\s)(\d?>\s*\/dev\/null|&>\s*\/dev\/null|2>&1)(?=\s|$)/g;

const SECRET_WORDS =
  /(^|[\s'"=:/])(\.env(\.\w+)?|\.envrc|\.netrc|\.git-credentials|\.npmrc|\.pypirc|\.claude\.json|\.credentials\.json|id_(rsa|dsa|ecdsa|ed25519)\w*|environ|printenv|hosts\.yml)(?=$|[\s'"/;|&)*])/;

/** Paths and names in a raw command that point at a credential, before any parsing. */
export function mentionsSecret(command: string, paths: Paths): boolean {
  if (SECRET_WORDS.test(command)) return true;
  const named = [
    paths.stateDir,
    "companion-telegram",
    "/proc/",
    ".claude/sessions",
    // A bare `.ssh` too: `git -C ~ show HEAD:.ssh/id_rsa` names no `/.ssh`.
    ...SECRET_HOME_DIRS.flatMap((d) => [`/${d}`, `~/${d}`, ...(d.includes("/") ? [] : [d])]),
  ];
  const inbox = join(paths.stateDir, "inbox");
  const withoutInbox = command.split(inbox).join("");
  return named.some((n) => withoutInbox.includes(n));
}

/** A shell or interpreter run on text: whatever it runs escapes every check here. */
const NESTED =
  /(^|[\s;&|(`])(bash|sh|zsh|dash|ksh|fish)\s+(-\w*c|-s)\b|(^|[\s;&|(`])(eval|exec|xargs|source|nohup|setsid|timeout|watch|env)\b|(^|[\s;&|(`])(python3?|node|bun|deno|perl|ruby|php|osascript)\s+-\w*[ce]\b|(^|[\s;&|(`])(bun|npx|bunx|deno)\s+(run|x)\b/;

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

// git: reads only, with the flags that write, run, or reach outside the repository refused.
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
]);
const GIT_BAD_ARGS =
  /^(-c|--config-env|--output|-o|-O|--exec-path|--upload-pack|--receive-pack|--ext-diff|--no-index|--contents|--git-dir|--work-tree|--namespace|--textconv|--open-files-in-pager)(=|$)|^-O./;
const GIT_LIST_FLAGS = /^(-a|-r|-v|-vv|--list|--show-current|--all|--remotes)$/;

function decideGit(args: string[], paths: Paths): Decision {
  let base = paths.dataDir;
  let i = 0;
  while (i < args.length && (args[i] === "-C" || args[i] === "--no-pager")) {
    if (args[i] === "-C") {
      const dir = resolvePath(args[i + 1] ?? "", paths);
      if (isSecretPath(dir, paths)) return deny(SECRET);
      // The memory folder is the one place the agent writes: a repository planted there
      // could carry a config that runs commands (core.fsmonitor).
      if (inside(dir, paths.dataDir) || !readable(dir, paths))
        return ask("git outside her repositories");
      base = dir;
      i += 2;
    } else i += 1;
  }
  const sub = args[i];
  const rest = args.slice(i + 1);
  if (args.some((a) => GIT_BAD_ARGS.test(a)))
    return deny("git options that run, write or read outside the repository are refused");
  // A path argument is checked as a read: relative ones from the repository folder.
  for (const a of rest.filter((a) => !a.startsWith("-"))) {
    for (const part of a.split(":").filter(Boolean)) {
      if (isSecretPath(resolvePath(part, paths, base), paths)) return deny(SECRET);
    }
  }
  if (sub && GIT_READS.has(sub)) return allow;
  if (sub === "branch") {
    for (let j = 0; j < rest.length; j++) {
      if (GIT_LIST_FLAGS.test(rest[j])) continue;
      if (
        /^--(contains|merged|no-merged)$/.test(rest[j]) &&
        /^[0-9a-f]{7,40}$/.test(rest[j + 1] ?? "")
      ) {
        j++;
        continue;
      }
      return deny(NO_GIT_WRITE);
    }
    return allow;
  }
  if (sub === "remote" && (rest.length === 0 || (rest.length === 1 && rest[0] === "-v")))
    return allow;
  return deny(NO_GIT_WRITE);
}

// gh: the flags that take a value, so a value is never read as a subcommand or endpoint.
const GH_VALUE_FLAGS = new Set([
  "-R",
  "--repo",
  "-X",
  "--method",
  "-H",
  "--header",
  "-f",
  "--raw-field",
  "-F",
  "--field",
  "-q",
  "--jq",
  "-t",
  "--template",
  "-p",
  "--preview",
  "--input",
  "--cache",
  "--hostname",
  "-L",
  "--limit",
  "-s",
  "--state",
  "-A",
  "--author",
  "-B",
  "--base",
  "-l",
  "--label",
  "--json",
  "-b",
  "--branch",
  "-w",
  "--workflow",
  "--search",
  "-S",
  "--assignee",
  "-a",
  "--owner",
  "--sort",
  "--order",
  "--language",
  "--head",
  "--commit",
  "--checks",
  "--required",
  "-j",
  "--job",
  "--attempt",
  "-e",
  "--event",
  "-u",
  "--user",
  "--created",
  "--status",
  "--app",
  "--visibility",
  "--topic",
  "--match",
  "--mention",
  "--reviewed-by",
  "--review-requested",
  "--review",
  "--merged",
  "--merged-at",
  "--involves",
  "--interval",
]);

/** Positional words and flags of a gh command, a flag paired with its value. */
function ghParse(args: string[]): { positional: string[]; flags: [string, string | undefined][] } {
  const positional: string[] = [];
  const flags: [string, string | undefined][] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith("--")) {
      const eq = a.indexOf("=");
      if (eq > 0) flags.push([a.slice(0, eq), a.slice(eq + 1)]);
      else if (GH_VALUE_FLAGS.has(a)) flags.push([a, args[++i]]);
      else flags.push([a, undefined]);
    } else if (a.startsWith("-") && a.length > 1) {
      // A short cluster, read letter by letter as gh's flag parser does: `-iX DELETE`
      // is `-i -X DELETE`, `-if title=x` is `-i -f title=x`, `-XPOST` is `-X POST`.
      for (let j = 1; j < a.length; j++) {
        const f = `-${a[j]}`;
        if (GH_VALUE_FLAGS.has(f)) {
          const rest = a.slice(j + 1).replace(/^=/, "");
          flags.push([f, rest || args[++i]]);
          break;
        }
        flags.push([f, undefined]);
      }
    } else positional.push(a);
  }
  return { positional, flags };
}

const GH_READS: Record<string, Set<string>> = {
  pr: new Set(["view", "list", "checks", "diff", "status"]),
  run: new Set(["view", "list"]),
  search: new Set(["prs", "issues", "repos", "commits"]),
  issue: new Set(["view", "list", "status"]),
  repo: new Set(["view"]),
  release: new Set(["view", "list"]),
  workflow: new Set(["view", "list"]),
};
const MERGE_SHAPE =
  /^gh pr merge (\d+) --repo ([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+) (--squash|--merge|--rebase) --match-head-commit ([0-9a-f]{40})$/;

/** The merge decision when the whole command is the gate's merge_command, else a denial. */
export function mergeDecision(command: string): Decision {
  const m = MERGE_SHAPE.exec(command);
  if (!m) return deny(MERGE_FORM);
  return { kind: "merge", number: Number(m[1]), repo: m[2], method: m[3], head: m[4], command };
}

/** `gh api`: reads only. GraphQL with its query inline and no mutation; REST as a plain GET. */
function decideGhApi(args: string[]): Decision {
  const { positional, flags } = ghParse(args);
  const endpoint = positional[0] ?? "";
  for (const [flag, value] of flags) {
    if (flag === "--hostname") return deny("gh api reaches only GitHub");
    if (flag === "--input") return deny(GH_MUTATION);
    if ((flag === "-X" || flag === "--method") && (value ?? "").toUpperCase() !== "GET")
      return deny(GH_MUTATION);
  }
  if (endpoint.includes("://")) return deny("gh api reaches only GitHub");
  const fields = flags.filter(([f]) => ["-f", "-F", "--field", "--raw-field"].includes(f));
  if (endpoint === "graphql") {
    for (const [, value] of fields) {
      const v = (value ?? "").slice((value ?? "").indexOf("=") + 1);
      if (v.startsWith("@")) return deny(GH_MUTATION); // a query read from a file is not seen here
      if (/\bmutation\b/i.test(v)) return deny(GH_MUTATION);
    }
    return allow;
  }
  if (fields.length > 0) return deny(GH_MUTATION); // a field makes gh send a POST
  return allow;
}

function decideGh(args: string[], command: string): Decision {
  const { positional, flags } = ghParse(args);
  const [group, sub] = positional;
  // The words after `api`: the endpoint is the first positional one there.
  if (group === "api") return decideGhApi(args.slice(args.indexOf("api") + 1));
  if (group === "pr" && positional.includes("merge")) return mergeDecision(command);
  if (flags.some(([f]) => f === "--hostname")) return deny("gh reaches only GitHub");
  if (group && sub && GH_READS[group]?.has(sub)) {
    if (flags.some(([f]) => f === "--web" || f === "-w")) return ask("opening a browser");
    return allow;
  }
  return ask("a gh command that may change something");
}

export function decideBash(raw: string, paths: Paths): Decision {
  const command = raw.trim();
  if (!command) return deny("an empty command");

  // What is refused whatever its shape: a pipe, a chain or quotes cannot launder any of it.
  // Quoted text (a search phrase) is left out of the word checks, never out of the secret,
  // merge and nested-shell ones.
  const bare = unquoted(command);
  if (mentionsSecret(command, paths)) return deny(SECRET);
  if (NESTED.test(bare))
    return deny("a nested shell or interpreter would run text no check here can read");
  if (/\bgh\b[\s\S]*\bauth\b/.test(bare))
    return deny("gh's credentials are not the companion's to read");
  if (/\bgh\b[\s\S]*\bpr\b[\s\S]*\bmerge\b/.test(command)) {
    if (/--admin\b|--auto\b/.test(command))
      return deny("a merge never goes around the rules: no --admin, no --auto");
    // Nothing chained, piped, quoted or added: the whole command is the gate's merge_command.
    return mergeDecision(command);
  }
  if (/\bgh\b[\s\S]*\bapi\b[\s\S]*\bmutation\b/i.test(command)) return deny(GH_MUTATION);
  if (
    /\bmerge\b[\s\S]*\bpulls?\b|\bpulls?\b[\s\S]*\bmerge\b/.test(bare) &&
    /\bgh\b[\s\S]*\bapi\b/.test(bare)
  )
    return deny(MERGE_FORM);
  if (/\bgh\b[\s\S]*\bpr\b[\s\S]*\breview\b/.test(bare) && /(--approve\b|\s-a\b)/.test(bare))
    return deny("approving a review is never the companion's to do");
  if (/\bgh\b[\s\S]*\brepo\b[\s\S]*\b(delete|archive|rename|edit)\b/.test(bare))
    return deny("repository settings are not the companion's to change");
  if (/\bdeploy\b/i.test(bare)) return deny("deploys are Athena's to run, never the companion's");
  if (/\bgit\b[\s\S]*\bpush\b/.test(bare)) {
    if (/(\s-[A-Za-z]*f[A-Za-z]*\b|--force|\s\+\S)/.test(bare))
      return deny("a force push is never the companion's to do");
    return deny("pushing is the work session's job: the companion writes no code");
  }
  const stripped = command.replace(HARMLESS_REDIRECTS, " ").trim();
  if (/>/.test(unquoted(stripped)))
    return deny("writing files from the shell is not the companion's: it writes only its memory");

  const words = shellWords(stripped);
  // A `gh pr` command that is not plain (an escape, a substitution, a chain) could spell a
  // merge no check here reads: it is refused, not asked.
  if (!words && /\bgh\b/.test(bare) && /\bpr\b/.test(bare))
    return deny("a gh pr command runs only written plainly, one per call");
  if (!words || words.length === 0) return ask("a command a plain split cannot vouch for");
  const [cmd, ...args] = words;
  if (/^\w+=/.test(cmd)) return ask("a command that sets variables");
  if (ENV_DUMPERS.has(cmd)) return deny("the environment holds credentials and is never printed");
  if (FILE_WRITERS.has(cmd))
    return deny("the companion writes only its memory folder, with Write and Edit");
  if ((cmd === "sed" || cmd === "perl") && args.some((a) => /^-[a-zA-Z]*i/.test(a)))
    return deny("the companion writes only its memory folder, with Write and Edit");

  if (cmd === "git") return decideGit(args, paths);
  if (cmd === "gh") return decideGh(args, stripped);

  if (cmd === "python3" || cmd === "python") {
    const script = args[0] ? resolvePath(args[0], paths) : "";
    const scripts = join(realish(resolve(paths.pluginRoot)), "scripts");
    if (script === join(scripts, "sessions.py") || script === join(scripts, "merge_gate.py"))
      return allow;
    if (script === join(scripts, "watch.py")) return deny("the service runs the watch itself");
    return ask("a script");
  }

  if (["pwd", "date", "whoami"].includes(cmd) && args.length === 0) return allow;
  // File reads go through Read, Grep and Glob, whose paths are checked; a shell read asks.
  return ask(
    "a command outside the companion's read-only list (read files with Read, Grep and Glob)",
  );
}

// ---------------------------------------------------------------- every tool

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export function decide(toolName: string, input: Record<string, unknown>, paths: Paths): Decision {
  if (toolName.startsWith(TELEGRAM_TOOL_PREFIX)) {
    // A file goes out from where the agent may read; from anywhere else it asks, and a
    // secret never goes.
    const files = Array.isArray(input.files) ? input.files.map(str) : [];
    const resolved = files.map((f) => (f ? resolvePath(f, paths) : ""));
    if (resolved.some((abs) => !abs || isSecretPath(abs, paths))) return deny(SECRET);
    if (resolved.some((abs) => !readable(abs, paths)))
      return ask("attaching a file from outside her repositories");
    return allow;
  }
  if (HARMLESS_TOOLS.has(toolName)) return allow;
  if (DISALLOWED_TOOLS.includes(toolName)) return deny(`${toolName} is off in the companion`);

  if (toolName === "Read" || toolName === "Grep" || toolName === "Glob" || toolName === "LS") {
    const raw = str(input.file_path) || str(input.path) || paths.dataDir;
    const abs = resolvePath(raw, paths);
    if (isSecretPath(abs, paths)) return deny(SECRET);
    const pattern = str(input.pattern);
    if (toolName === "Glob") {
      if (namesSecret(pattern)) return deny(SECRET);
      if (obscureGlob(pattern))
        return ask("a pattern whose brackets or braces no check here can read");
      const fixed = pattern.split(/[*?[{]/)[0];
      const fixedAbs = resolvePath(fixed || ".", paths, abs);
      if (isSecretPath(fixedAbs, paths)) return deny(SECRET);
      if (!readable(fixedAbs, paths)) return ask("reading outside her repositories");
    }
    if (toolName === "Grep") {
      const filter = `${str(input.glob)} ${str(input.type)}`;
      if (namesSecret(filter)) return deny(SECRET);
      if (obscureGlob(filter))
        return ask("a filter whose brackets or braces no check here can read");
    }
    return readable(abs, paths) ? allow : ask("reading outside her repositories");
  }

  if (WRITE_TOOLS.has(toolName)) {
    const target = str(input.file_path);
    if (!target) return deny("a write with no path");
    const abs = resolvePath(target, paths);
    if (inside(abs, join(paths.dataDir, "memory")) && !isSecretPath(abs, paths)) return allow;
    return deny("the companion writes only its memory folder");
  }

  if (toolName === "Bash") return decideBash(str(input.command), paths);
  if (toolName === "WebFetch" || toolName === "WebSearch") return ask("reaching the web");
  return ask(`a tool outside the companion's list (${toolName})`);
}
