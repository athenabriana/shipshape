import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import {
  decide,
  decideBash,
  shellWords,
  staticDenyRules,
  type Decision,
  type Paths,
} from "../permissions.ts";

function setup(): Paths {
  const home = mkdtempSync(join(tmpdir(), "companion-perm-"));
  const paths: Paths = {
    home,
    stateDir: join(home, ".local", "state", "companion-telegram"),
    dataDir: join(home, ".local", "share", "companion"),
    pluginRoot: join(home, ".claude", "plugins", "cache", "shipshape", "companion", "0.3.0"),
    readRoots: [join(home, "Workspaces")],
  };
  for (const d of [
    join(paths.stateDir, "inbox"),
    join(paths.dataDir, "memory"),
    join(paths.pluginRoot, "scripts"),
    join(home, "Workspaces", "repo"),
    join(home, ".ssh"),
    join(home, ".config", "gh"),
  ])
    mkdirSync(d, { recursive: true });
  writeFileSync(join(paths.stateDir, ".env"), "TELEGRAM_BOT_TOKEN=1:x\n");
  return paths;
}

const P = setup();
const kind = (d: Decision) => d.kind;
const bash = (c: string) => kind(decideBash(c, P));

describe("reads", () => {
  test("her repositories, the plugin, the memory and the inbox read without asking", () => {
    expect(kind(decide("Read", { file_path: join(P.home, "Workspaces/repo/a.ts") }, P))).toBe("allow");
    expect(kind(decide("Read", { file_path: "~/Workspaces/repo/README.md" }, P))).toBe("allow");
    expect(kind(decide("Read", { file_path: join(P.pluginRoot, "persona.md") }, P))).toBe("allow");
    expect(kind(decide("Read", { file_path: "memory/prefs.md" }, P))).toBe("allow");
    expect(kind(decide("Read", { file_path: join(P.stateDir, "inbox", "1-a.jpg") }, P))).toBe("allow");
    expect(kind(decide("Grep", { pattern: "x" }, P))).toBe("allow");
    expect(kind(decide("Glob", { pattern: "**/*.ts", path: join(P.home, "Workspaces") }, P))).toBe("allow");
  });

  test("credentials are denied, the state folder above all", () => {
    for (const f of [
      join(P.stateDir, ".env"),
      join(P.stateDir, "access.json"),
      join(P.stateDir, "sessions.json"),
      join(P.home, ".ssh", "id_ed25519"),
      join(P.home, ".config", "gh", "hosts.yml"),
      join(P.home, ".claude", ".credentials.json"),
      join(P.home, ".claude", "sessions", "123.abc.key"),
      join(P.home, ".claude", "projects", "-x", "s.jsonl"),
      join(P.home, "Workspaces", "repo", ".env"),
      join(P.home, "Workspaces", "repo", ".env.local"),
      join(P.home, "Workspaces", "repo", "server.pem"),
      "/proc/self/environ",
      "~/.netrc",
    ])
      expect(decide("Read", { file_path: f }, P)).toMatchObject({ kind: "deny" });
    expect(kind(decide("Grep", { pattern: "TOKEN", path: P.stateDir }, P))).toBe("deny");
    expect(kind(decide("Glob", { pattern: `${P.home}/.ssh/*` }, P))).toBe("deny");
    expect(kind(decide("Grep", { pattern: "x", glob: "**/.env*" }, P))).toBe("deny");
  });

  test("a symlink into a secret folder is a secret", () => {
    const link = join(P.home, "Workspaces", "repo", "innocent");
    symlinkSync(join(P.home, ".ssh"), link);
    expect(kind(decide("Read", { file_path: join(link, "id_rsa_backup") }, P))).toBe("deny");
  });

  test("anything else outside her repositories asks", () => {
    expect(kind(decide("Read", { file_path: "/etc/hosts" }, P))).toBe("ask");
    expect(kind(decide("Read", { file_path: join(P.home, "Documents", "x.txt") }, P))).toBe("ask");
  });
});

describe("writes", () => {
  test("only the memory folder", () => {
    expect(kind(decide("Write", { file_path: join(P.dataDir, "memory", "prefs.md") }, P))).toBe("allow");
    expect(kind(decide("Edit", { file_path: "memory/follow.md" }, P))).toBe("allow");
    expect(kind(decide("Write", { file_path: join(P.home, "Workspaces/repo/a.ts") }, P))).toBe("deny");
    expect(kind(decide("Write", { file_path: join(P.stateDir, "access.json") }, P))).toBe("deny");
    expect(kind(decide("Write", { file_path: "memory/../../../../.bashrc" }, P))).toBe("deny");
    expect(kind(decide("Edit", { file_path: join(P.dataDir, "watch.json") }, P))).toBe("deny");
    expect(kind(decide("Write", {}, P))).toBe("deny");
  });
});

describe("bash", () => {
  test("read-only git, gh and the plugin's scripts run without asking", () => {
    for (const c of [
      "git log --oneline -5",
      `git -C ${P.home}/Workspaces/repo status`,
      "git diff main...HEAD --stat",
      "git branch --show-current",
      "git remote -v",
      "gh pr view 41 --repo athenabriana/shipshape --json title,body",
      "gh pr checks 41 --repo athenabriana/shipshape",
      "gh run view 123 --log-failed",
      "gh search prs --author @me --state open",
      "gh api repos/athenabriana/shipshape/pulls/41",
      `gh api graphql -f query='query { viewer { login } }'`,
      `python3 ${P.pluginRoot}/scripts/sessions.py`,
      `python3 ${P.pluginRoot}/scripts/sessions.py show ab12cd --turns 8`,
      `python3 ${P.pluginRoot}/scripts/merge_gate.py athenabriana/shipshape 41`,
      `ls ${P.home}/Workspaces/repo`,
      "git log 2>/dev/null",
    ])
      expect([c, bash(c)]).toEqual([c, "allow"]);
  });

  test("credentials, mutations, force pushes, admin merges and deploys are denied", () => {
    for (const c of [
      `cat ${P.stateDir}/.env`,
      "cat ~/.config/gh/hosts.yml",
      "cat .env",
      "env",
      "printenv CLAUDE_CODE_OAUTH_TOKEN",
      "cat /proc/self/environ",
      "gh auth token",
      "gh auth status --show-token",
      "gh api -X DELETE repos/a/b/git/refs/heads/x",
      "gh api repos/a/b/issues -f title=x",
      "gh api --method=PATCH repos/a/b",
      `gh api graphql -f query='mutation { mergePullRequest(input: {}) { clientMutationId } }'`,
      "git push --force origin main",
      "git push -f",
      "git push origin +main",
      "git push origin feature",
      "git commit -m x",
      "git reset --hard",
      "git -c core.pager=evil log",
      "gh pr merge 41 --repo a/b --squash --admin",
      "gh pr merge 41 --repo a/b --auto --squash",
      "gh pr merge 41",
      "gh pr review 41 --approve",
      "lexflow deploy ./app",
      "npm run deploy",
      "rm -rf ~/Workspaces/repo",
      "echo hi > ~/x",
      "git log > /tmp/out",
      "sed -i s/a/b/ file",
      "sudo ls",
      `python3 ${P.pluginRoot}/scripts/watch.py --once`,
      "gh pr view 1 | cat ~/.ssh/id_rsa",
    ])
      expect([c, bash(c)]).toEqual([c, "deny"]);
  });

  test("anything a plain split cannot vouch for, or outside the list, asks", () => {
    for (const c of [
      "gh pr view 41 --json body | jq .body",
      "git log && git status",
      "echo $(whoami)",
      'echo "$HOME"',
      "curl https://example.com",
      "gh pr comment 41 --body hi",
      "gh pr checkout 41",
      "npm install",
      `python3 ${P.home}/Workspaces/repo/x.py`,
      "find . -exec rm {} ;",
      "cat /etc/hosts",
      "FOO=1 gh pr view 1",
    ])
      expect([c, bash(c)]).toEqual([c, "ask"]);
  });

  test("a search phrase in quotes does not trip the deploy or push words", () => {
    expect(bash(`gh search prs "deploy pipeline" --author @me`)).toBe("allow");
    expect(bash(`gh pr view 1 --json title --jq '.title'`)).toBe("allow");
  });

  test("the merge passes only in the gate's exact form", () => {
    const sha = "a".repeat(40);
    expect(decideBash(`gh pr merge 41 --repo athenabriana/shipshape --squash --match-head-commit ${sha}`, P)).toEqual({
      kind: "merge",
      repo: "athenabriana/shipshape",
      number: 41,
      method: "--squash",
      head: sha,
      command: `gh pr merge 41 --repo athenabriana/shipshape --squash --match-head-commit ${sha}`,
    });
    expect(bash(`gh pr merge 41 --repo a/b --squash --match-head-commit ${sha} --delete-branch`)).toBe("deny");
    expect(bash(`gh pr merge 41 --repo a/b --squash --match-head-commit ${sha}; echo`)).toBe("deny");
  });
});

describe("other tools", () => {
  test("its own Telegram tools and session messaging run; dialogs and sub-agents are off", () => {
    expect(kind(decide("mcp__telegram__reply", {}, P))).toBe("allow");
    expect(kind(decide("SendMessage", { to: "x", message: "y" }, P))).toBe("allow");
    expect(kind(decide("ListAgents", {}, P))).toBe("allow");
    expect(kind(decide("AskUserQuestion", {}, P))).toBe("deny");
    expect(kind(decide("Agent", {}, P))).toBe("deny");
    expect(kind(decide("WebFetch", { url: "https://x" }, P))).toBe("ask");
    expect(kind(decide("mcp__other__thing", {}, P))).toBe("ask");
  });

  test("the static deny rules name the state folder and the credential files", () => {
    const rules = staticDenyRules(P);
    expect(rules).toContain(`Read(/${P.stateDir}/.env)`);
    expect(rules).toContain(`Read(/${join(P.home, ".config/gh")}/**)`);
    expect(rules).toContain("Read(**/.env)");
    expect(rules.every((r) => /^(Read|Edit)\(/.test(r))).toBe(true);
  });
});

describe("shellWords", () => {
  test("splits plain words and quotes, refuses what it cannot vouch for", () => {
    expect(shellWords(`gh pr view 1 --jq '.a | .b'`)).toEqual(["gh", "pr", "view", "1", "--jq", ".a | .b"]);
    expect(shellWords(`echo "a b"`)).toEqual(["echo", "a b"]);
    for (const c of ["a | b", "a; b", "a && b", "$(x)", "`x`", "a > b", "a *", 'echo "$X"', "'open"])
      expect(shellWords(c)).toBeNull();
  });
});
