#!/usr/bin/env bun
/**
 * Runs the behavior scenarios against the real agent and writes what happened.
 *
 * Part of the companion plugin, Apache License, Version 2.0 (see LICENSE and NOTICE).
 *
 *   bun behavior/run.ts [--out DIR] [--model NAME] [SCENARIO ...]
 *
 * Every scenario (or the ones named) runs through `harness.ts` on this machine's own
 * Claude Code login, one after another. For each, DIR gets `<id>.md` (the transcript, for
 * a judge to read) and `<id>.json` (the raw events), and stdout gets one JSON line with the
 * code checks. It calls the model, so it is not part of `bun test`; the tests run the same
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
  const ids: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--out") out = argv[++i];
    else if (argv[i] === "--model") model = argv[++i];
    else ids.push(argv[i]);
  }
  mkdirSync(out, { recursive: true });
  const chosen = ids.length ? SCENARIOS.filter((s) => ids.includes(s.id)) : SCENARIOS;
  for (const s of chosen) {
    let line: object;
    try {
      const t = await runScenario(s, { model });
      writeFileSync(join(out, `${s.id}.md`), renderTranscript(t, s.title));
      writeFileSync(join(out, `${s.id}.json`), JSON.stringify(t.events, null, 2));
      line = { scenario: s.id, goals: s.goals, checks: runChecks(s.goals, t) };
    } catch (err) {
      line = { scenario: s.id, error: String(err) };
    }
    console.log(JSON.stringify(line));
  }
  console.error(`transcripts in ${out}`);
  process.exit(0);
}
