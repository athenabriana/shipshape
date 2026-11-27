#!/usr/bin/env bun
/**
 * Runs the behavior scenarios against the real agent and writes what happened.
 *
 * Part of the companion plugin, Apache License, Version 2.0 (see LICENSE and NOTICE).
 *
 *   bun behavior/run.ts [--out DIR] [--model NAME] [--repeat N] [--tuned | --held-out] [SCENARIO ...]
 *
 * Every scenario (or the ones named, or one set) runs through `harness.ts` on this
 * machine's own Claude Code login, one after another, N times each (a model's answers
 * vary, so a behavior holds only when every run shows it). For each run, DIR gets
 * `<id>.r<k>.md` (the transcript, for a judge to read) and `<id>.r<k>.json` (the raw
 * events), and stdout gets one JSON line with the code checks. The held-out scenarios are
 * the ones the person tuning the persona never reads: only the judge does.
 *
 * To rerun the loop, use `/ss:iterate` with the conversation judge
 * (`skills/iterate/references/judge-conversation.md` in ss): this runner is its replayer,
 * `goals.md` its goals. It calls the model, so it is not part of `bun test`; the tests run the same
 * harness on a scripted stand-in.
 */

import { mkdirSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { runChecks } from "./checks.ts";
import { runScenario, type Event, type Transcript } from "./harness.ts";
import { SCENARIOS } from "./scenarios.ts";

/** The transcript as a judge reads it: what she sent, what came back, what ran. */
export function renderTranscript(t: Transcript, title: string): string {
  const out: string[] = [`# ${t.scenario}: ${title}`, ""];
  const quote = (s: string) =>
    s
      .split("\n")
      .map((l) => `> ${l}`)
      .join("\n");
  for (const e of t.events as Event[]) {
    switch (e.t) {
      case "user":
        out.push(
          `**Athena${e.forwarded ? " (forwarded message)" : ""}${e.voice ? " (voice)" : ""}:**`,
          quote(e.text),
          "",
        );
        break;
      case "watch":
        out.push(`**Watch event:** ${e.lines.map((l) => `\`${l}\``).join(", ")}`, "");
        break;
      case "reply":
        out.push(`**Companion → chat:**`, quote(e.text), "");
        break;
      case "notify":
        out.push(`**Companion → notify (ping):**`, quote(e.text), "");
        break;
      case "edit":
        out.push(`*(edits its progress message: ${e.text.slice(0, 120)})*`, "");
        break;
      case "ask":
        out.push(
          `**Permission button${e.tapOnly ? " (tap only)" : ""}:** ${e.text.replace(/\n+/g, " / ")} → ${e.answer ? "tapped Allow" : "denied"}`,
          "",
        );
        break;
      case "tool":
        out.push(
          `- tool \`${e.name}\` ${e.input.command ? `\`${String(e.input.command)}\`` : JSON.stringify(e.input).slice(0, 200)}`,
        );
        break;
      case "decision":
        if (e.kind !== "allow") out.push(`  - policy: ${e.kind} (${e.reason ?? ""})`);
        break;
      case "send_message":
        out.push(`**SendMessage → ${e.to}:**`, quote(e.message), "");
        break;
      case "stop":
        out.push(`**Athena: /stop**`, "");
        break;
      default:
        break;
    }
  }
  const calls = (t.events as Event[]).filter((e) => e.t === "gh" || e.t === "script");
  if (calls.length) {
    out.push("", "## Recorded calls", "");
    for (const c of calls)
      out.push(`- ${c.t === "gh" ? `gh ${c.args.join(" ")}` : `${c.name} ${c.args.join(" ")}`}`);
  }
  return out.join("\n") + "\n";
}

if (import.meta.main) {
  const argv = process.argv.slice(2);
  let out = join(tmpdir(), "companion-behavior", new Date().toISOString().replace(/[:.]/g, "-"));
  let model: string | undefined;
  let repeat = 1;
  let set: "all" | "tuned" | "held-out" = "all";
  const ids: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--out") out = argv[++i];
    else if (argv[i] === "--model") model = argv[++i];
    else if (argv[i] === "--repeat") repeat = Math.max(1, Number(argv[++i]) || 1);
    else if (argv[i] === "--tuned") set = "tuned";
    else if (argv[i] === "--held-out") set = "held-out";
    else ids.push(argv[i]);
  }
  mkdirSync(out, { recursive: true });
  const chosen = SCENARIOS.filter(
    (s) =>
      (ids.length === 0 || ids.includes(s.id)) &&
      (set === "all" || (set === "held-out") === Boolean(s.heldOut)),
  );
  for (const s of chosen) {
    for (let k = 1; k <= repeat; k++) {
      let line: object;
      try {
        const t = await runScenario(s, { model });
        writeFileSync(join(out, `${s.id}.r${k}.md`), renderTranscript(t, s.title));
        writeFileSync(join(out, `${s.id}.r${k}.json`), JSON.stringify(t.events, null, 2));
        line = {
          scenario: s.id,
          run: k,
          heldOut: Boolean(s.heldOut),
          goals: s.goals,
          checks: runChecks(s.goals, t, s),
        };
      } catch (err) {
        line = { scenario: s.id, run: k, error: String(err) };
      }
      console.log(JSON.stringify(line));
    }
  }
  console.error(`transcripts in ${out}`);
  process.exit(0);
}
