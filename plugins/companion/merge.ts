/**
 * The merge path: a `gh pr merge` the agent wants to run is checked against Ship Shape's
 * review gate for that PR's head before Athena is even asked.
 *
 * Part of the companion plugin, Apache License, Version 2.0 (see LICENSE and NOTICE).
 *
 * `permissions.ts` lets a merge through only in the exact form `scripts/merge_gate.py`
 * prints. Here the gate runs again, fresh, and the command must be the one it prints now:
 * the same PR, method and head, with CI green, the repository's rules clear and a review
 * verdict that still covers the head. Only then does the agent's `canUseTool` send the
 * confirm button. A merge word that came by voice is refused: the persona asks her to
 * type it. Whether the PR changes a user interface, and so needs the design loop's line, is
 * not something the gate can tell: the persona checks `design_line` before it asks.
 */

import { spawn } from "child_process";
import { join } from "path";
import type { MergeDecision } from "./permissions.ts";
import { childEnv } from "./redact.ts";

/** What `merge_gate.py` prints (the fields this check reads). */
export type GateResult = {
  ok?: boolean;
  pr?: string;
  title?: string;
  head?: string;
  ci?: string | null;
  verdict?: string | null;
  rounds?: number | null;
  goals?: string | null;
  reasons?: string[];
  merge_command?: string | null;
  error?: string;
};

export type MergeRequest = Omit<MergeDecision, "kind">;

export type MergeCheck = { ok: true; prompt: string } | { ok: false; reason: string };

/** Whether the gate's fresh answer lets this exact merge go up for her tap, and the ask's words. */
export function checkMerge(req: MergeRequest, gate: GateResult, typed: boolean): MergeCheck {
  if (!typed)
    return {
      ok: false,
      reason:
        "this turn holds no message she typed herself (a voice note, a forward or a watch event is never her merge word): ask her to type it, then run the gate again",
    };
  if (gate.error) return { ok: false, reason: `the review gate could not run: ${gate.error}` };
  if (gate.ok !== true) {
    const why = (gate.reasons ?? []).join("; ") || "the review gate did not pass";
    return { ok: false, reason: `the review gate refused the merge: ${why}` };
  }
  if (gate.pr !== `${req.repo}#${req.number}`)
    return { ok: false, reason: "the gate answered for another PR" };
  if (gate.head !== req.head)
    return {
      ok: false,
      reason: `the PR head moved to ${String(gate.head).slice(0, 7)}: run the gate again and say the new facts`,
    };
  if (gate.merge_command !== req.command)
    return {
      ok: false,
      reason: `run exactly the gate's merge_command: ${gate.merge_command ?? "(none)"}`,
    };
  const verdict = gate.verdict
    ? `revisão ${gate.verdict} em ${gate.rounds ?? "?"} rodada(s)`
    : "revisão";
  // Plain text: the button message is sent without a parse mode.
  const title = gate.title ? ` "${gate.title}"` : "";
  return {
    ok: true,
    prompt:
      `🔀 Mesclar o PR ${req.number} do ${req.repo}${title}?\n\n` +
      `CI verde e ${verdict} no commit ${req.head.slice(0, 7)}.\n` +
      `${req.command}`,
  };
}

/** Runs `scripts/merge_gate.py REPO NUMBER` with no tokens in its environment. */
export function runMergeGate(
  pluginRoot: string,
  repo: string,
  number: number,
  signal?: AbortSignal,
  timeoutMs = 240_000,
): Promise<GateResult> {
  return new Promise((resolve) => {
    const child = spawn(
      "python3",
      [join(pluginRoot, "scripts", "merge_gate.py"), repo, String(number)],
      {
        env: childEnv(),
        // stderr is not read, so it is not piped: a full pipe would stall the child.
        stdio: ["ignore", "pipe", "ignore"],
      },
    );
    let out = "";
    let settled = false;
    const done = (r: GateResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      resolve(r);
    };
    const onAbort = () => {
      child.kill("SIGKILL");
      done({ error: "the turn ended before the gate finished" });
    };
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      done({ error: "merge_gate.py did not finish in time" });
    }, timeoutMs);
    if (signal?.aborted) onAbort();
    else signal?.addEventListener("abort", onAbort);
    child.stdout.setEncoding("utf8").on("data", (c: string) => {
      if (out.length < 200_000) out += c;
    });
    child.on("error", (err) => done({ error: `merge_gate.py could not run: ${err.message}` }));
    child.on("close", () => {
      try {
        const parsed = JSON.parse(out);
        done(
          parsed && typeof parsed === "object"
            ? (parsed as GateResult)
            : { error: "merge_gate.py printed no object" },
        );
      } catch {
        done({ error: "merge_gate.py printed no JSON" });
      }
    });
  });
}
