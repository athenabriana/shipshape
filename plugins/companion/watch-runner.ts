/**
 * The watch, inside the service: `scripts/watch.py` as a child process, restarted when it
 * ends, its lines batched into one agent turn.
 *
 * Part of the companion plugin, Apache License, Version 2.0 (see LICENSE and NOTICE).
 *
 * No monitor to re-arm: the service starts the watch once and keeps it running. Lines
 * that never need Athena (`watch-started`, `github-back`, a passing `watch-error`) are only
 * logged; the rest wait a few seconds for company and wake the agent together, which pings
 * her with `notify` only when something needs her. A watch that cannot run (another one
 * holds its lock, or it keeps dying) wakes the agent once, so she learns her PRs are not
 * watched. watch.py is the cheap check: the model is called only when it prints a change.
 * The watch never sees a token.
 */

import { spawn, type ChildProcess } from "child_process";
import { createInterface } from "readline";
import { join } from "path";
import { childEnv } from "./redact.ts";

const QUIET_KINDS = new Set(["watch-started", "github-back", "watch-error"]);

/** The event kind of one watch line (`<kind> | <subject> | <detail>`). */
export function kindOf(line: string): string {
  return line.split(" | ", 1)[0].trim();
}

/** Whether a line may need Athena, so it is worth an agent turn. */
export function wakes(line: string): boolean {
  const kind = kindOf(line);
  return kind !== "" && !QUIET_KINDS.has(kind);
}

export type WatchOptions = {
  pluginRoot: string;
  stateFile: string;
  onEvents: (lines: string[]) => void;
  log: (line: string) => void;
  batchMs?: number;
  spawnWatch?: () => ChildProcess;
};

export class WatchRunner {
  private child?: ChildProcess;
  private stopped = false;
  private batch: string[] = [];
  private timer?: ReturnType<typeof setTimeout>;
  private restarts = 0;
  private toldBroken = false;

  constructor(private readonly opts: WatchOptions) {}

  start(): void {
    if (this.stopped) return;
    const child = this.opts.spawnWatch
      ? this.opts.spawnWatch()
      : spawn(
          "python3",
          [join(this.opts.pluginRoot, "scripts", "watch.py"), "--state", this.opts.stateFile],
          { env: childEnv(), stdio: ["ignore", "pipe", "pipe"] },
        );
    this.child = child;
    const started = Date.now();
    if (child.stdout) createInterface({ input: child.stdout }).on("line", (l) => this.line(l));
    if (child.stderr)
      createInterface({ input: child.stderr }).on("line", (l) => this.opts.log(`watch: ${l}`));
    // A failed spawn may come with no `close`: either event ends this run, once.
    let ended = false;
    const onEnd = (code: number | string | null) => {
      if (ended || this.stopped) return;
      ended = true;
      // A watch that ran a while starts over quickly; one that keeps dying backs off.
      const healthy = Date.now() - started > 600_000;
      this.restarts = healthy ? 0 : this.restarts + 1;
      if (healthy) this.toldBroken = false;
      if (this.restarts === 3)
        this.broken(`the watch stopped ${this.restarts} times in a row (last exit code ${code})`);
      const delay = Math.min(30_000 * 2 ** Math.min(this.restarts, 4), 600_000);
      this.opts.log(`watch: ended (code ${code}), starting again in ${delay / 1000}s`);
      setTimeout(() => this.start(), delay).unref();
    };
    child.on("error", (err) => {
      this.opts.log(`watch: could not start: ${err.message}`);
      onEnd("spawn error");
    });
    child.on("close", (code) => onEnd(code));
  }

  /** Tells the agent once that the watch is not running, until it runs well again. */
  private broken(why: string): void {
    if (this.toldBroken) return;
    this.toldBroken = true;
    this.opts.log(`watch: ${why}`);
    this.opts.onEvents([
      `watch-broken | watch | ${why}: her PRs and sessions are not being watched`,
    ]);
  }

  private line(line: string): void {
    const text = line.trim();
    if (!text) return;
    if (kindOf(text) === "watch-error" && /already running/.test(text)) {
      this.broken(text.split(" | ").slice(2).join(" | ") || "another watch holds the lock");
      return;
    }
    if (!wakes(text)) {
      this.opts.log(`watch: ${text}`);
      return;
    }
    this.batch.push(text);
    if (!this.timer)
      this.timer = setTimeout(() => {
        this.timer = undefined;
        const lines = this.batch.splice(0);
        if (lines.length) this.opts.onEvents(lines);
      }, this.opts.batchMs ?? 5000);
  }

  stop(): void {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    this.child?.kill("SIGTERM");
  }
}
