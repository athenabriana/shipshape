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
 * `download_attachment`) for progress notes, pictures and pings.
 *
 * Permissions are code, not settings: `settingSources: []` keeps her `~/.claude` settings
 * out, a `PreToolUse` hook runs `permissions.ts` on every call, the secret paths are deny
 * rules too, and `canUseTool` turns an ask into a Telegram button that a timeout denies.
 * A merge also passes the review gate for the PR's head (`merge.ts`) before the button.
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
import { z } from "zod";
import { checkMerge, type GateResult } from "./merge.ts";
import { decide, DISALLOWED_TOOLS, staticDenyRules, type Paths } from "./permissions.ts";
import { ChatSessions } from "./chats.ts";
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
  /** Sends a button and resolves true on her Allow, false on Deny, timeout or abort. */
  askButton(chatId: string, text: string, detail: string, signal: AbortSignal): Promise<boolean>;
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
  gate: (repo: string, number: number) => Promise<GateResult>;
  model?: string;
  maxTurns?: number;
  /** A seam for the tests. */
  run?: typeof query;
};

/** The final text that means "nothing to say" on a watch turn or any other. */
export const SILENT = "NO_REPLY";

function attr(v: string): string {
  return v.replace(/[<>"\r\n]/g, "_");
}

/** The prompt for one turn: her messages tagged with what the agent needs, watch lines apart. */
export function promptFor(items: Inbound[]): string {
  return items
    .map((item) => {
      if (item.kind === "watch") return `<watch-event>${attr(item.line)}</watch-event>`;
      const attrs = Object.entries(item.attrs)
        .map(([k, v]) => ` ${k}="${attr(v)}"`)
        .join("");
      return `<message${attrs}>\n${item.text}\n</message>`;
    })
    .join("\n\n");
}

/** The command or path a permission button shows, masked and cut short. */
export function preview(toolName: string, input: Record<string, unknown>): string {
  const pick = input.command ?? input.file_path ?? input.path ?? input.url ?? input.query;
  const text = typeof pick === "string" ? pick : JSON.stringify(input);
  const masked = redact(text);
  return masked.length > 600 ? `${masked.slice(0, 599)}…` : masked;
}

type ChatState = { running: boolean; pending: Inbound[] };

export class Companion {
  private chats = new Map<string, ChatState>();
  private aborts = new Set<AbortController>();

  constructor(private readonly cfg: CompanionConfig) {}

  /** Queues the item for the chat; a running turn takes it in its next batch. */
  submit(chatId: string, item: Inbound): void {
    const state = this.chats.get(chatId) ?? { running: false, pending: [] };
    this.chats.set(chatId, state);
    state.pending.push(item);
    if (!state.running) void this.drain(chatId, state);
  }

  /** Stops every running turn. */
  stop(): void {
    for (const a of this.aborts) a.abort();
  }

  private async drain(chatId: string, state: ChatState): Promise<void> {
    state.running = true;
    try {
      while (state.pending.length > 0) {
        const batch = state.pending.splice(0);
        try {
          await this.turn(chatId, batch);
        } catch (err) {
          this.cfg.io.log(`companion: turn failed: ${redact(String(err))}`);
        }
      }
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
      reply_to: a.reply_to != null ? Number(a.reply_to) : undefined,
    });
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
              await io.react(chatId, Number(a.message_id), a.emoji);
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
              await io.edit(chatId, Number(a.message_id), a.text, a.format ?? "markdown");
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
  permissionHandlers(chatId: string, typed: boolean): { hook: HookCallback; canUseTool: CanUseTool } {
    const { paths, io, gate } = this.cfg;
    const hook: HookCallback = async (input) => {
      if (input.hook_event_name !== "PreToolUse") return {};
      const d = decide(input.tool_name, (input.tool_input ?? {}) as Record<string, unknown>, paths);
      const permissionDecision =
        d.kind === "allow" ? "allow" : d.kind === "deny" ? "deny" : "ask";
      return {
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision,
          permissionDecisionReason: d.kind === "deny" || d.kind === "ask" ? d.reason : "companion policy",
        },
      };
    };
    const canUseTool: CanUseTool = async (toolName, input, { signal }) => {
      const d = decide(toolName, input, paths);
      if (d.kind === "allow") return { behavior: "allow", updatedInput: input };
      if (d.kind === "deny") return { behavior: "deny", message: d.reason };
      let text: string;
      if (d.kind === "merge") {
        const check = checkMerge(d, await gate(d.repo, d.number), typed);
        if (!check.ok) return { behavior: "deny", message: check.reason };
        text = check.prompt;
      } else {
        text = `🔐 Posso usar \`${toolName}\`? (${d.reason})`;
      }
      const yes = await io.askButton(chatId, text, preview(toolName, input), signal);
      return yes
        ? { behavior: "allow", updatedInput: input }
        : { behavior: "deny", message: "Athena did not allow it (a tap on Deny, or no answer in time). Do not try another way." };
    };
    return { hook, canUseTool };
  }

  options(chatId: string, typed: boolean, abortController: AbortController, resume?: string): Options {
    const { paths, persona, io } = this.cfg;
    const { hook, canUseTool } = this.permissionHandlers(chatId, typed);
    return {
      cwd: paths.dataDir,
      settingSources: [],
      permissionMode: "default",
      systemPrompt: { type: "preset", preset: "claude_code", append: persona },
      mcpServers: { telegram: this.tools(chatId) },
      disallowedTools: [...DISALLOWED_TOOLS, ...staticDenyRules(paths)],
      hooks: { PreToolUse: [{ hooks: [hook] }] },
      canUseTool,
      abortController,
      maxTurns: this.cfg.maxTurns ?? 60,
      ...(this.cfg.model ? { model: this.cfg.model } : {}),
      ...(resume ? { resume } : {}),
      // Claude Code needs its own token and never the bot's; the scrub keeps both out of
      // the Bash commands it runs (code.claude.com/docs/en/env-vars, CLAUDE_CODE_SUBPROCESS_ENV_SCRUB).
      env: {
        ...childEnv(process.env, ["CLAUDE_CODE_OAUTH_TOKEN", "ANTHROPIC_API_KEY"]),
        CLAUDE_CODE_SUBPROCESS_ENV_SCRUB: "1",
        CLAUDE_AGENT_SDK_CLIENT_APP: "shipshape-companion",
      },
      stderr: (data: string) => io.log(`claude: ${redact(data.trimEnd())}`),
    };
  }

  /** One query over the batch; the session id is kept for the chat as soon as it is known. */
  private async turn(chatId: string, batch: Inbound[]): Promise<void> {
    const { io, sessions } = this.cfg;
    const run = this.cfg.run ?? query;
    const answers = batch.some((i) => i.kind === "chat");
    const typed = batch.some((i) => i.kind === "chat" && i.typed);
    const prompt = promptFor(batch);
    const typing = answers ? setInterval(() => io.typing(chatId), 4000) : undefined;
    if (answers) io.typing(chatId);

    const attempt = async (resume?: string) => {
      const abort = new AbortController();
      this.aborts.add(abort);
      let started = false;
      let result: { ok: boolean; text: string } | undefined;
      try {
        for await (const msg of run({ prompt, options: this.options(chatId, typed, abort, resume) }) as AsyncIterable<SDKMessage>) {
          if (msg.type === "system" && msg.subtype === "init") {
            started = true;
            sessions.set(chatId, msg.session_id);
          } else if (msg.type === "result") {
            started = true;
            sessions.set(chatId, msg.session_id);
            result =
              msg.subtype === "success"
                ? { ok: true, text: msg.result }
                : { ok: false, text: (msg.errors ?? []).join("; ") || msg.subtype };
          }
        }
      } catch (err) {
        if (!started) return { started, error: err };
        if (!result) result = { ok: false, text: String(err) };
      } finally {
        this.aborts.delete(abort);
      }
      return { started, result };
    };

    try {
      const resume = sessions.get(chatId);
      let outcome = await attempt(resume);
      if (!outcome.started && resume) {
        // The saved session could not be resumed (gone, or from another machine): start fresh.
        io.log(`companion: could not resume the chat's session, starting a new one`);
        sessions.forget(chatId);
        outcome = await attempt();
      }
      if (!outcome.started) throw outcome.error ?? new Error("the agent did not start");
      const result = outcome.result;
      if (!answers) return;
      if (!result) return;
      if (!result.ok) {
        await io.deliver(chatId, {
          text: `Não consegui terminar essa: ${redact(result.text).slice(0, 300)}`,
          files: [],
          svgs: [],
          format: "text",
        });
        return;
      }
      const text = result.text.trim();
      if (text && text !== SILENT) await io.deliver(chatId, { text, files: [], svgs: [], format: "markdown" });
    } catch (err) {
      io.log(`companion: the agent failed: ${redact(String(err))}`);
      if (answers)
        await io
          .deliver(chatId, {
            text: "Não consegui falar com o Claude agora. O log do serviço diz por quê.",
            files: [],
            svgs: [],
            format: "text",
          })
          .catch(() => {});
    } finally {
      if (typing) clearInterval(typing);
    }
  }
}
