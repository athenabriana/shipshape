/**
 * The companion's brain: one Agent SDK conversation per Telegram chat.
 *
 * Part of the companion plugin, Apache License, Version 2.0 (see LICENSE and NOTICE).
 *
 * Each allowed message (or a batch of them, when several arrive while a turn runs) becomes
 * one `query()` that resumes the chat's session (`chats.ts`), with the persona appended to
 * Claude Code's own system prompt. The final answer goes back to the chat through the
 * same reply, format, SVG and voice code the channel used; the agent also has the
 * companion's Telegram tools in-process (`reply`, `notify`, `react`, `edit_message`,
 * `download_attachment`) for progress notes, pictures and pings. Watch events run in turns
 * of their own, never batched with her messages, under a daily cap.
 *
 * Permissions are code, not settings: `settingSources: []` keeps her `~/.claude` settings
 * out, `tools` lists the only built-in tools the agent has, a `PreToolUse` hook runs
 * `permissions.ts` on every call, the secret paths are deny rules too, and `canUseTool`
 * turns an ask into a Telegram button that a timeout denies. No tool is in `allowedTools`:
 * an auto-approved tool never reaches `canUseTool`. A merge also passes the review gate
 * for the PR's head (`merge.ts`) before the button, and only in a turn of typed messages.
 *
 * Sessions rotate: one idle longer than `COMPANION_SESSION_IDLE_DAYS` or whose transcript
 * grew past `COMPANION_SESSION_MAX_MB` starts fresh, and a resume that fails because the
 * session is gone starts fresh once. `systemPrompt.snapshot: false` makes a persona change
 * reach resumed sessions. The rotation, the stale-resume pattern and the snapshot choice
 * follow nanocoai/nanoclaw (MIT, Gavriel Cohen), `container/agent-runner/src/poll-loop.ts`
 * and `src/providers/claude.ts`; the daily cap on watch wakes follows its scheduler.
 *
 * SDK reference: https://code.claude.com/docs/en/agent-sdk/typescript.md (query, Options,
 * CanUseTool, PermissionResult), permissions.md (evaluation order: hooks, deny rules, ask
 * rules, mode, allow rules, canUseTool), sessions.md (resume), custom-tools.md
 * (createSdkMcpServer, tool), modifying-system-prompts.md (preset with append).
 */

import {
  createSdkMcpServer,
  query,
  tool,
  type CanUseTool,
  type HookCallback,
  type Options,
  type SDKMessage,
} from "@anthropic-ai/claude-agent-sdk";
import { statSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { z } from "zod";
import { ChatSessions } from "./chats.ts";
import { checkMerge, type GateResult } from "./merge.ts";
import {
  AGENT_TOOLS,
  decide,
  DISALLOWED_TOOLS,
  staticDenyRules,
  type Paths,
} from "./permissions.ts";
import { childEnv, redact } from "./redact.ts";

export type Outbound = {
  text: string;
  reply_to?: number;
  files: string[];
  svgs: string[];
  format: string;
};

/** What the agent needs from the Telegram side (server.ts). */
export type Io = {
  deliver(chatId: string, o: Outbound): Promise<number[]>;
  notify(o: Outbound): Promise<string>;
  react(chatId: string, messageId: number, emoji: string): Promise<void>;
  edit(chatId: string, messageId: number, text: string, format: string): Promise<void>;
  download(fileId: string): Promise<string>;
  /**
   * Sends a button and resolves true on her Allow, false on Deny, timeout or abort. A
   * tap-only ask (a merge) takes no typed "yes CODE".
   */
  askButton(
    chatId: string,
    text: string,
    detail: string,
    signal: AbortSignal,
    opts?: { tapOnly?: boolean },
  ): Promise<boolean>;
  typing(chatId: string): void;
  log(line: string): void;
};

/** One thing that wakes the agent: her message, or a line from the watch. */
export type Inbound =
  | { kind: "chat"; text: string; attrs: Record<string, string>; typed: boolean }
  | { kind: "watch"; line: string };

export type CompanionConfig = {
  paths: Paths;
  persona: string;
  sessions: ChatSessions;
  io: Io;
  gate: (repo: string, number: number, signal?: AbortSignal) => Promise<GateResult>;
  model?: string;
  maxTurns?: number;
  /** A session idle longer than this starts fresh. */
  maxIdleDays?: number;
  /** A session whose transcript grew past this starts fresh. */
  maxTranscriptMb?: number;
  /** Watch turns per day, at most; past it, events are only logged. */
  watchDailyCap?: number;
  /** Where Claude Code keeps transcripts (`CLAUDE_CONFIG_DIR`, else `~/.claude`). */
  claudeHome?: string;
  /** Seams for the tests. */
  run?: typeof query;
  now?: () => number;
};

/** The final line that means "nothing to say". */
export const SILENT = "NO_REPLY";

/** A resume that failed because the session is gone (nanoclaw's pattern, MIT). */
export const STALE_RESUME = /no conversation found|ENOENT.*\.jsonl|session.*not found/i;

function attr(v: string): string {
  return v.replace(/[<>"\r\n]/g, "_");
}

/** Her text, with nothing in it able to close the tag or open one of the service's own. */
function body(text: string): string {
  return text.replace(/<(\/?)(message|watch-event)\b/gi, "‹$1$2");
}

/** The prompt for one turn: her messages tagged with what the agent needs, watch lines apart. */
export function promptFor(items: Inbound[]): string {
  return items
    .map((item) => {
      if (item.kind === "watch") return `<watch-event>${attr(item.line)}</watch-event>`;
      const attrs = Object.entries(item.attrs)
        .map(([k, v]) => ` ${k}="${attr(v)}"`)
        .join("");
      return `<message${attrs}>\n${body(item.text)}\n</message>`;
    })
    .join("\n\n");
}

/** The command or path a permission button shows, masked and cut short. */
export function preview(toolName: string, input: Record<string, unknown>): string {
  const pick = input.command ?? input.file_path ?? input.path ?? input.url ?? input.query;
  const text = typeof pick === "string" ? pick : JSON.stringify(input);
  const masked = Array.from(redact(text));
  return masked.length > 600 ? `${masked.slice(0, 599).join("")}…` : masked.join("");
}

/** The final answer without a closing `NO_REPLY` line; empty when nothing is left. */
export function answerText(result: string): string {
  const lines = result.trim().split("\n");
  while (lines.length && lines[lines.length - 1].trim() === SILENT) lines.pop();
  return lines.join("\n").trim();
}

/** What she reads when a turn ended on an error, by what the error says. */
export function failureText(error: string): string {
  if (/authenticat|invalid api key|oauth|401|\/login|token.*(expired|revoked)/i.test(error))
    return "Meu acesso ao Claude foi recusado: o token pode ter expirado. Rode `claude setup-token` no terminal e salve o novo com `token-env.sh set claude`, depois reinicie o serviço.";
  if (/usage limit|rate limit|limit reached|429|overloaded|529/i.test(error))
    return "O Claude está no limite agora (uso do plano ou sobrecarga). Tenta de novo daqui a pouco.";
  return `Não consegui terminar essa: ${redact(error).slice(0, 300)}`;
}

/** A positive integer message id, or undefined. */
function messageId(v: string | undefined): number | undefined {
  const n = Number(v);
  return v && Number.isInteger(n) && n > 0 ? n : undefined;
}

type ChatState = {
  running: boolean;
  scheduled: boolean;
  pending: Inbound[];
  generation: number;
  abort?: AbortController;
};

export class Companion {
  private chats = new Map<string, ChatState>();
  private aborts = new Set<AbortController>();
  private stopped = false;
  private watchDay = "";
  private watchTurns = 0;

  constructor(private readonly cfg: CompanionConfig) {}

  private now(): number {
    return this.cfg.now ? this.cfg.now() : Date.now();
  }

  private state(chatId: string): ChatState {
    let state = this.chats.get(chatId);
    if (!state) {
      state = { running: false, scheduled: false, pending: [], generation: 0 };
      this.chats.set(chatId, state);
    }
    return state;
  }

  /**
   * Queues the items for the chat. Everything submitted in the same tick, and everything
   * that arrives while a turn runs, is taken together in the next batch.
   */
  submit(chatId: string, items: Inbound | Inbound[]): void {
    const list = Array.isArray(items) ? items : [items];
    if (this.stopped) {
      this.cfg.io.log(`companion: stopping, ${list.length} item(s) for ${chatId} dropped`);
      return;
    }
    const state = this.state(chatId);
    state.pending.push(...list);
    if (state.running || state.scheduled) return;
    state.scheduled = true;
    queueMicrotask(() => {
      state.scheduled = false;
      if (!state.running) void this.drain(chatId, state);
    });
  }

  /** `/nova`: the chat's next message starts a fresh session, even if a turn runs now. */
  reset(chatId: string): boolean {
    const state = this.state(chatId);
    state.generation++;
    return this.cfg.sessions.forget(chatId);
  }

  /** `/stop`: ends the chat's running turn and drops what was waiting. True when one ran. */
  abortChat(chatId: string): boolean {
    const state = this.chats.get(chatId);
    if (!state) return false;
    state.pending.length = 0;
    if (!state.abort) return false;
    state.abort.abort();
    return true;
  }

  /** Stops every running turn and takes no more work. */
  stop(): void {
    this.stopped = true;
    for (const a of this.aborts) a.abort();
  }

  private async drain(chatId: string, state: ChatState): Promise<void> {
    state.running = true;
    try {
      while (state.pending.length > 0 && !this.stopped) {
        // Her messages and watch events never share a turn: a watch line is not her word,
        // and a watch turn's answer is not sent.
        const kind = state.pending[0].kind;
        let n = 0;
        while (n < state.pending.length && state.pending[n].kind === kind) n++;
        const batch = state.pending.splice(0, n);
        try {
          await this.turn(chatId, batch, state);
        } catch (err) {
          this.cfg.io.log(`companion: turn failed: ${redact(String(err))}`);
        }
      }
      if (this.stopped && state.pending.length)
        this.cfg.io.log(`companion: stopping, ${state.pending.length} item(s) left unanswered`);
    } finally {
      state.running = false;
    }
  }

  /** The Telegram tools, bound to this turn's chat. */
  private tools(chatId: string) {
    const io = this.cfg.io;
    const ok = (text: string) => ({ content: [{ type: "text" as const, text }] });
    const fail = (name: string, err: unknown) => ({
      content: [
        {
          type: "text" as const,
          text: `${name} failed: ${redact(err instanceof Error ? err.message : String(err))}`,
        },
      ],
      isError: true,
    });
    const fmt = z.enum(["markdown", "text", "markdownv2"]).optional();
    const outbound = (a: {
      text?: string;
      files?: string[];
      svgs?: string[];
      format?: string;
      reply_to?: string;
    }): Outbound => ({
      text: a.text ?? "",
      files: a.files ?? [],
      svgs: a.svgs ?? [],
      format: a.format ?? "markdown",
      reply_to: messageId(a.reply_to),
    });
    const needId = (name: string, v: string) => {
      const id = messageId(v);
      if (id === undefined) throw new Error(`${name} needs a message_id from a <message> tag`);
      return id;
    };
    return createSdkMcpServer({
      name: "telegram",
      version: "1.0.0",
      tools: [
        tool(
          "reply",
          "Send a message to Athena now, in this chat: an interim note, a picture (svgs: SVG markup rendered to PNG) or a file she asked for (files: absolute paths). Text is Markdown. Your final answer is sent for you, so never repeat it here.",
          {
            text: z.string(),
            files: z.array(z.string()).optional(),
            svgs: z.array(z.string()).optional(),
            format: fmt,
            reply_to: z.string().optional(),
          },
          async (a) => {
            try {
              const ids = await io.deliver(chatId, outbound(a));
              return ok(`sent (ids: ${ids.join(", ")})`);
            } catch (err) {
              return fail("reply", err);
            }
          },
        ),
        tool(
          "notify",
          "Ping Athena with news she did not ask for (a session waiting on her, a red CI run, a PR ready for her merge word). Use it on a watch event that needs her; it makes her phone ping.",
          {
            text: z.string(),
            files: z.array(z.string()).optional(),
            svgs: z.array(z.string()).optional(),
            format: fmt,
          },
          async (a) => {
            try {
              return ok(await io.notify(outbound(a)));
            } catch (err) {
              return fail("notify", err);
            }
          },
        ),
        tool(
          "react",
          "Add an emoji reaction to one of her messages (Telegram's fixed list: 👍 👎 ❤ 🔥 👀 🎉 …).",
          { message_id: z.string(), emoji: z.string() },
          async (a) => {
            try {
              await io.react(chatId, needId("react", a.message_id), a.emoji);
              return ok("reacted");
            } catch (err) {
              return fail("react", err);
            }
          },
        ),
        tool(
          "edit_message",
          "Edit a message the bot sent in this chat, for progress. Edits do not ping her phone.",
          { message_id: z.string(), text: z.string(), format: fmt },
          async (a) => {
            try {
              await io.edit(
                chatId,
                needId("edit_message", a.message_id),
                a.text,
                a.format ?? "markdown",
              );
              return ok("edited");
            } catch (err) {
              return fail("edit_message", err);
            }
          },
        ),
        tool(
          "download_attachment",
          "Download the file of one of her messages (its attachment_file_id) to the inbox and return the local path to Read.",
          { file_id: z.string() },
          async (a) => {
            try {
              return ok(await io.download(a.file_id));
            } catch (err) {
              return fail("download_attachment", err);
            }
          },
        ),
      ],
    });
  }

  /** The hook and the callback that hold the permission policy, for one turn. */
  permissionHandlers(
    chatId: string,
    typed: boolean,
  ): { hook: HookCallback; canUseTool: CanUseTool } {
    const { paths, io, gate } = this.cfg;
    const hook: HookCallback = async (input) => {
      if (input.hook_event_name !== "PreToolUse") return {};
      const d = decide(input.tool_name, (input.tool_input ?? {}) as Record<string, unknown>, paths);
      const permissionDecision = d.kind === "allow" ? "allow" : d.kind === "deny" ? "deny" : "ask";
      return {
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision,
          permissionDecisionReason:
            d.kind === "deny" || d.kind === "ask" ? d.reason : "companion policy",
        },
      };
    };
    const canUseTool: CanUseTool = async (toolName, input, { signal }) => {
      const d = decide(toolName, input, paths);
      if (d.kind === "allow") return { behavior: "allow", updatedInput: input };
      if (d.kind === "deny") return { behavior: "deny", message: d.reason };
      let text: string;
      if (d.kind === "merge") {
        const result = await gate(d.repo, d.number, signal);
        if (signal.aborted) return { behavior: "deny", message: "the turn ended" };
        const check = checkMerge(d, result, typed);
        if (!check.ok) return { behavior: "deny", message: check.reason };
        text = check.prompt;
      } else {
        text = `🔐 Posso usar ${toolName}? (${d.reason})`;
      }
      const yes = await io.askButton(chatId, text, preview(toolName, input), signal, {
        tapOnly: d.kind === "merge",
      });
      return yes
        ? { behavior: "allow", updatedInput: input }
        : {
            behavior: "deny",
            message:
              "Athena did not allow it (a tap on Deny, no answer in time, or she moved on). Do not try another way.",
          };
    };
    return { hook, canUseTool };
  }

  options(
    chatId: string,
    typed: boolean,
    abortController: AbortController,
    resume?: string,
    stderr?: (line: string) => void,
  ): Options {
    const { paths, persona, io } = this.cfg;
    const { hook, canUseTool } = this.permissionHandlers(chatId, typed);
    // Claude Code needs its own credential and never the bot's token; the scrub keeps them
    // out of the commands it runs (code.claude.com/docs/en/env-vars, CLAUDE_CODE_SUBPROCESS_ENV_SCRUB).
    // With a setup-token present, an API key in the environment is left out, so the login
    // the README documents is the one in use.
    const keep = process.env.CLAUDE_CODE_OAUTH_TOKEN
      ? ["CLAUDE_CODE_OAUTH_TOKEN"]
      : ["ANTHROPIC_API_KEY"];
    return {
      cwd: paths.dataDir,
      settingSources: [],
      permissionMode: "default",
      tools: AGENT_TOOLS,
      systemPrompt: { type: "preset", preset: "claude_code", append: persona, snapshot: false },
      mcpServers: { telegram: this.tools(chatId) },
      disallowedTools: [...DISALLOWED_TOOLS, ...staticDenyRules(paths)],
      hooks: { PreToolUse: [{ hooks: [hook] }] },
      canUseTool,
      abortController,
      maxTurns: this.cfg.maxTurns ?? 60,
      ...(this.cfg.model ? { model: this.cfg.model } : {}),
      ...(resume ? { resume } : {}),
      env: {
        ...childEnv(process.env, keep),
        CLAUDE_CODE_SUBPROCESS_ENV_SCRUB: "1",
        CLAUDE_AGENT_SDK_CLIENT_APP: "shipshape-companion",
      },
      stderr: (data: string) => {
        stderr?.(data);
        io.log(`claude: ${redact(data.trimEnd())}`);
      },
    };
  }

  /** The chat's session to resume, or undefined when it should start fresh. */
  private resumable(chatId: string): string | undefined {
    const entry = this.cfg.sessions.entry(chatId);
    if (!entry) return undefined;
    const idleDays = (this.now() - entry.updated) / 86_400_000;
    const maxIdle = this.cfg.maxIdleDays ?? 7;
    const home = this.cfg.claudeHome ?? join(homedir(), ".claude");
    const file = join(
      home,
      "projects",
      this.cfg.paths.dataDir.replace(/[^A-Za-z0-9]/g, "-"),
      `${entry.sessionId}.jsonl`,
    );
    let mb = 0;
    try {
      mb = statSync(file).size / 1_048_576;
    } catch {}
    const maxMb = this.cfg.maxTranscriptMb ?? 8;
    if (idleDays > maxIdle || mb > maxMb) {
      this.cfg.io.log(
        `companion: chat ${chatId} starts a fresh session (idle ${idleDays.toFixed(1)} days, transcript ${mb.toFixed(1)} MB)`,
      );
      this.cfg.sessions.forget(chatId);
      return undefined;
    }
    return entry.sessionId;
  }

  /** Whether a watch turn fits today's cap; counts it when it does. */
  private watchAllowed(): boolean {
    const day = new Date(this.now()).toISOString().slice(0, 10);
    if (day !== this.watchDay) {
      this.watchDay = day;
      this.watchTurns = 0;
    }
    if (this.watchTurns >= (this.cfg.watchDailyCap ?? 24)) return false;
    this.watchTurns++;
    return true;
  }

  /** One query over the batch; the session id is kept for the chat as soon as it is known. */
  private async turn(chatId: string, batch: Inbound[], state: ChatState): Promise<void> {
    const { io, sessions } = this.cfg;
    const run = this.cfg.run ?? query;
    const answers = batch[0].kind === "chat";
    if (!answers && !this.watchAllowed()) {
      io.log(`companion: watch cap reached for today, ${batch.length} event(s) only logged`);
      return;
    }
    // A merge needs her typed word: every message in the turn typed, none forwarded or voiced.
    const typed = answers && batch.every((i) => i.kind === "chat" && i.typed);
    const prompt = promptFor(batch);
    const generation = state.generation;
    const keep = (sessionId: string) => {
      if (state.generation === generation) sessions.set(chatId, sessionId, this.now());
    };
    const typing = answers ? setInterval(() => io.typing(chatId), 4000) : undefined;
    if (answers) io.typing(chatId);

    const attempt = async (resume?: string) => {
      const abort = new AbortController();
      state.abort = abort;
      this.aborts.add(abort);
      let started = false;
      let stderrText = "";
      let result: { ok: boolean; text: string } | undefined;
      try {
        const messages = run({
          prompt,
          options: this.options(chatId, typed, abort, resume, (d) => {
            if (stderrText.length < 8000) stderrText += d;
          }),
        }) as AsyncIterable<SDKMessage>;
        for await (const msg of messages) {
          if (msg.type === "system" && msg.subtype === "init") {
            started = true;
            keep(msg.session_id);
          } else if (msg.type === "result") {
            started = true;
            keep(msg.session_id);
            result =
              msg.subtype === "success" && !msg.is_error
                ? { ok: true, text: msg.result }
                : {
                    ok: false,
                    text:
                      (msg.subtype === "success" ? msg.result : (msg.errors ?? []).join("; ")) ||
                      msg.subtype,
                  };
          }
        }
      } catch (err) {
        if (!started) return { started, aborted: abort.signal.aborted, error: err, stderrText };
        if (!result) result = { ok: false, text: String(err) };
      } finally {
        this.aborts.delete(abort);
        if (state.abort === abort) state.abort = undefined;
      }
      return { started, aborted: abort.signal.aborted, result, stderrText };
    };

    try {
      const resume = this.resumable(chatId);
      let outcome = await attempt(resume);
      if (
        !outcome.started &&
        !outcome.aborted &&
        resume &&
        STALE_RESUME.test(`${String(outcome.error)}\n${outcome.stderrText}`)
      ) {
        io.log(`companion: the chat's session is gone, starting a new one`);
        if (state.generation === generation) sessions.forget(chatId);
        outcome = await attempt();
      }
      if (outcome.aborted) {
        io.log(`companion: a turn for ${chatId} was stopped`);
        return;
      }
      if (!outcome.started) throw outcome.error ?? new Error("the agent did not start");
      const result = outcome.result;
      if (!result) return;
      if (!result.ok) {
        io.log(`companion: the turn ended on an error: ${redact(result.text).slice(0, 300)}`);
        if (answers)
          await io.deliver(chatId, {
            text: failureText(result.text),
            files: [],
            svgs: [],
            format: "markdown",
          });
        return;
      }
      if (!answers) return;
      const text = answerText(result.text);
      if (!text) return;
      try {
        await io.deliver(chatId, { text, files: [], svgs: [], format: "markdown" });
      } catch (err) {
        io.log(`companion: the answer could not be sent: ${redact(String(err))}`);
      }
    } catch (err) {
      io.log(`companion: the agent failed: ${redact(String(err))}`);
      if (answers)
        await Promise.resolve()
          .then(() =>
            io.deliver(chatId, {
              text: "Não consegui falar com o Claude agora. O log do serviço diz por quê.",
              files: [],
              svgs: [],
              format: "text",
            }),
          )
          .catch(() => {});
    } finally {
      if (typing) clearInterval(typing);
    }
  }
}
