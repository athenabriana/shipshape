import { expect, test } from "bun:test";
import { checkMerge, type GateResult, type MergeRequest } from "../merge.ts";

const head = "4f2a9c1".padEnd(40, "0");
const command = `gh pr merge 41 --repo athenabriana/shipshape --squash --match-head-commit ${head}`;
const req: MergeRequest = { repo: "athenabriana/shipshape", number: 41, method: "--squash", head, command };
const passing: GateResult = {
  ok: true,
  pr: "athenabriana/shipshape#41",
  title: "remove /ss:assistant",
  head,
  ci: "SUCCESS",
  verdict: "clean",
  rounds: 2,
  reasons: [],
  merge_command: command,
};

test("a passing gate on the same head and command goes up for her tap", () => {
  const c = checkMerge(req, passing, true);
  expect(c.ok).toBe(true);
  if (c.ok) {
    expect(c.prompt).toContain("PR 41");
    expect(c.prompt).toContain("4f2a9c1");
    expect(c.prompt).toContain("revisão clean em 2 rodada(s)");
    expect(c.prompt).toContain(command);
  }
});

test("a merge word by voice is refused before anything else", () => {
  expect(checkMerge(req, passing, false)).toMatchObject({ ok: false, reason: expect.stringContaining("voice") });
});

test("a failing or broken gate refuses, with its reasons", () => {
  expect(checkMerge(req, { error: "gh failed" }, true)).toMatchObject({ ok: false, reason: expect.stringContaining("gh failed") });
  const stale = { ...passing, ok: false, reasons: ["the review verdict does not cover the current head"] };
  expect(checkMerge(req, stale, true)).toMatchObject({ ok: false, reason: expect.stringContaining("does not cover") });
  expect(checkMerge(req, { ...passing, ok: undefined }, true).ok).toBe(false);
});

test("a moved head, another PR or another command refuses", () => {
  const moved = { ...passing, head: "b".repeat(40), merge_command: command.replace(head, "b".repeat(40)) };
  expect(checkMerge(req, moved, true)).toMatchObject({ ok: false, reason: expect.stringContaining("moved") });
  expect(checkMerge(req, { ...passing, pr: "athenabriana/shipshape#42" }, true).ok).toBe(false);
  expect(checkMerge(req, { ...passing, merge_command: command.replace("--squash", "--merge") }, true)).toMatchObject({
    ok: false,
    reason: expect.stringContaining("exactly"),
  });
});
