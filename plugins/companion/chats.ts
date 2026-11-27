/**
 * Which Agent SDK session continues each Telegram chat.
 *
 * Part of the companion plugin, Apache License, Version 2.0 (see LICENSE and NOTICE).
 *
 * One chat, one resumed session: the map lives in `sessions.json` in the state folder
 * (mode 600), never in a temporary folder, so a restart picks the conversation up where
 * it was. Each entry keeps when the chat last used it, so `agent.ts` can rotate a session
 * left idle too long. `/nova` in the chat forgets the chat's session and the next message
 * starts a fresh one.
 */

import { mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import { dirname } from "path";

type Entry = { sessionId: string; updated: number };

const SESSION_ID = /^[A-Za-z0-9-]{8,80}$/;

export class ChatSessions {
  constructor(private readonly file: string) {}

  private load(): Record<string, Entry> {
    try {
      const data = JSON.parse(readFileSync(this.file, "utf8"));
      if (!data || typeof data !== "object" || Array.isArray(data)) return {};
      const out: Record<string, Entry> = {};
      for (const [chat, e] of Object.entries(data as Record<string, unknown>)) {
        const entry = e as Partial<Entry>;
        if (typeof entry?.sessionId === "string" && SESSION_ID.test(entry.sessionId))
          out[chat] = { sessionId: entry.sessionId, updated: Number(entry.updated) || 0 };
      }
      return out;
    } catch {
      return {};
    }
  }

  private save(data: Record<string, Entry>): void {
    mkdirSync(dirname(this.file), { recursive: true, mode: 0o700 });
    const tmp = `${this.file}.tmp`;
    writeFileSync(tmp, JSON.stringify(data, null, 2) + "\n", { mode: 0o600 });
    renameSync(tmp, this.file);
  }

  get(chatId: string): string | undefined {
    return this.load()[chatId]?.sessionId;
  }

  /** The chat's session and when it was last used, in milliseconds since the epoch. */
  entry(chatId: string): Entry | undefined {
    return this.load()[chatId];
  }

  set(chatId: string, sessionId: string, now = Date.now()): void {
    if (!SESSION_ID.test(sessionId)) return;
    const data = this.load();
    data[chatId] = { sessionId, updated: now };
    this.save(data);
  }

  forget(chatId: string): boolean {
    const data = this.load();
    if (!(chatId in data)) return false;
    delete data[chatId];
    this.save(data);
    return true;
  }
}
