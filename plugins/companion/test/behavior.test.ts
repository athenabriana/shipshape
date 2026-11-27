/**
 * The behavior harness without a model: a scripted stand-in for query() plays a turn, and
 * the harness, the fixture tools and the code checks must record and judge it right. The
 * model runs themselves are `bun behavior/run.ts`, outside CI.
 */

import { describe, expect, test } from "bun:test";
import { execFileSync } from "child_process";
import { mkdtempSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { runChecks, sentences } from "../behavior/checks.ts";
import { runScenario, type Transcript } from "../behavior/harness.ts";
import { renderTranscript } from "../behavior/run.ts";
import { MERGE_48, SCENARIOS } from "../behavior/scenarios.ts";

const SID = "0b1c2d3e-4f50-6172-8394-a5b6c7d8e9f0";
const byId = (id: string) => SCENARIOS.find((s) => s.id === id)!;

/** A query() stand-in that answers each turn with the given text, and can run tools first. */
function scripted(turns: { text: string; tools?: { name: string; input: object }[] }[]) {
  let n = 0;
  return ((args: { prompt: string; options: any }) => {
    const turn = turns[Math.min(n++, turns.length - 1)];
    return (async function* () {
      yield { type: "system", subtype: "init", session_id: SID };
      for (const t of turn.tools ?? []) {
        yield {
          type: "assistant",
          message: { content: [{ type: "tool_use", name: t.name, input: t.input }] },
        };
        await Bun.sleep(5);
        if (args.options.abortController.signal.aborted) throw new Error("aborted");
        // The real CLI asks the hook and canUseTool before a tool runs; the stand-in does too.
        const hook = args.options.hooks.PreToolUse[0].hooks[0];
        const out = await hook(
          { hook_event_name: "PreToolUse", tool_name: t.name, tool_input: t.input },
          undefined,
          { signal: args.options.abortController.signal },
        );
        const decision = out.hookSpecificOutput?.permissionDecision;
        const asked =
          decision === "ask"
            ? await args.options.canUseTool(t.name, t.input, {
                signal: args.options.abortController.signal,
              })
            : undefined;
        const allowed = decision === "allow" || asked?.behavior === "allow";
        if (allowed && t.name === "Bash") {
          execFileSync("bash", ["-c", String((t.input as { command: string }).command)], {
            env: process.env,
            stdio: "ignore",
          });
        }
      }
      yield {
        type: "result",
        subtype: "success",
        is_error: false,
        result: turn.text,
        session_id: SID,
      };
    })();
  }) as any;
}

describe("the harness records a run", () => {
  test("a status turn: the fixture tools answer, the calls are recorded, the checks pass", async () => {
    const s = byId("status");
    const fixture = join(import.meta.dir, "..", "behavior", "fixture", "scripts", "sessions.py");
    const t = await runScenario(s, {
      run: scripted([
        {
          tools: [
            { name: "Bash", input: { command: `python3 ${fixture}` } },
            {
              name: "Bash",
              input: { command: "gh pr view 48 --repo athenabriana/shipshape --json title" },
            },
          ],
          text: "O router rename está esperando você decidir se mantém os nomes antigos como alias. O PR 48 está pronto para o seu sim.",
        },
      ]),
    });
    expect(t.events.some((e) => e.t === "script" && e.name === "sessions.py")).toBe(true);
    expect(t.events.some((e) => e.t === "gh" && e.args[0] === "pr" && e.args[1] === "view")).toBe(
      true,
    );
    expect(runChecks(s.goals, t).filter((c) => !c.ok)).toEqual([]);
    expect(renderTranscript(t, s.title)).toContain("**Companion → chat:**");
  });

  test("the checks catch an English answer, an offer to look and a time estimate", async () => {
    const s = byId("status");
    const t = await runScenario(s, {
      run: scripted([
        {
          text: "Nada precisa de você. Quer que eu olhe os PRs? The PR is ready and you can merge it in 10 minutos.",
        },
      ]),
    });
    const failed = runChecks(s.goals, t)
      .filter((c) => !c.ok)
      .map((c) => c.goal);
    expect(failed).toEqual(expect.arrayContaining(["B1", "B3", "B4", "B5"]));
  });

  test("a merge runs only through the gate's command, the tap-only button, and the fixture gh", async () => {
    const s = byId("merge-clean");
    const t = await runScenario(s, {
      run: scripted([
        {
          text:
            "PR 48 do `shipshape`: CI verde no `4f2a9c1` e a revisão fechou limpa em 3 rodadas. Vou rodar `" +
            MERGE_48 +
            "`. Posso?",
        },
        {
          tools: [{ name: "Bash", input: { command: MERGE_48 } }],
          text: "Mesclado o PR 48 no commit `4f2a9c1`.",
        },
      ]),
    });
    const asks = t.events.filter((e) => e.t === "ask");
    expect(asks).toHaveLength(1);
    expect(asks[0]).toMatchObject({ tapOnly: true, answer: true });
    expect(runChecks(["B8"], t)).toEqual([{ goal: "B8", ok: true, detail: "ok" }]);
  });

  test("a forwarded merge word never reaches a button", async () => {
    const s = byId("forwarded");
    const t = await runScenario(s, {
      run: scripted([
        {
          tools: [{ name: "Bash", input: { command: MERGE_48 } }],
          text: "Isso é uma mensagem encaminhada, não um pedido seu.",
        },
      ]),
    });
    expect(t.events.filter((e) => e.t === "ask")).toEqual([]);
    expect(runChecks(["B10"], t)[0].ok).toBe(true);
  });

  test("/stop ends the turn at its first tool call with Parei.", async () => {
    const s = byId("stop");
    const t = await runScenario(s, {
      run: scripted([
        {
          tools: [{ name: "Bash", input: { command: "gh pr list" } }],
          text: "isto não deveria chegar",
        },
      ]),
    });
    expect(runChecks(["B13"], t)[0]).toMatchObject({ ok: true });
  });

  test("a quiet watch tick that speaks fails B12", async () => {
    const s = byId("quiet-watch");
    const quiet = await runScenario(s, { run: scripted([{ text: "NO_REPLY" }]) });
    expect(runChecks(["B12"], quiet)[0].ok).toBe(true);
  });
});

describe("the fixture tools", () => {
  test("gh answers from the world and records the call; a merge only says it merged", () => {
    const dir = mkdtempSync(join(tmpdir(), "companion-fixture-"));
    const world = join(dir, "world.json");
    const calls = join(dir, "calls.jsonl");
    writeFileSync(world, JSON.stringify(byId("status").world));
    writeFileSync(calls, "");
    const gh = join(import.meta.dir, "..", "behavior", "fixture", "bin", "gh");
    const env = { ...process.env, COMPANION_FIXTURE: world, COMPANION_CALLS: calls };
    const view = JSON.parse(
      execFileSync(
        "python3",
        [gh, "pr", "view", "48", "--repo", "athenabriana/shipshape", "--json", "title"],
        { env, encoding: "utf8" },
      ),
    );
    expect(view.number).toBe(48);
    expect(
      execFileSync("python3", [gh, ...MERGE_48.split(" ").slice(1)], { env, encoding: "utf8" }),
    ).toContain("merged");
    expect(execFileSync("cat", [calls], { encoding: "utf8" }).trim().split("\n")).toHaveLength(2);
  });
});

describe("sentences", () => {
  test("counts prose sentences, not code or links", () => {
    expect(sentences("Oi! Tudo certo. `gh pr view 48`")).toHaveLength(2);
    expect(sentences("Veja https://x.y/a.b e pronto.")).toHaveLength(1);
  });
});

export type { Transcript };
