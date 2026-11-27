import { expect, test } from "bun:test";
import { mkdtempSync, readFileSync, statSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { ChatSessions } from "../chats.ts";

const file = () => join(mkdtempSync(join(tmpdir(), "companion-chats-")), "state", "sessions.json");
const id = "0b1c2d3e-4f50-6172-8394-a5b6c7d8e9f0";

test("each chat keeps its own session, across instances, in a private file", () => {
  const f = file();
  const a = new ChatSessions(f);
  expect(a.get("111")).toBeUndefined();
  a.set("111", id);
  a.set("222", id.replace("0b", "ff"));
  const b = new ChatSessions(f);
  expect(b.get("111")).toBe(id);
  expect(b.get("222")).toBe(id.replace("0b", "ff"));
  expect(statSync(f).mode & 0o777).toBe(0o600);
});

test("forget drops one chat and says whether it had one", () => {
  const s = new ChatSessions(file());
  s.set("111", id);
  expect(s.forget("111")).toBe(true);
  expect(s.get("111")).toBeUndefined();
  expect(s.forget("111")).toBe(false);
});

test("a session id that is not one is never stored, and a broken file reads as empty", () => {
  const f = file();
  const s = new ChatSessions(f);
  s.set("111", "../../etc/passwd");
  expect(s.get("111")).toBeUndefined();
  s.set("111", id);
  writeFileSync(f, "{not json");
  expect(s.get("111")).toBeUndefined();
  writeFileSync(f, JSON.stringify({ "111": { sessionId: "bad id!" }, "222": { sessionId: id } }));
  expect(s.get("111")).toBeUndefined();
  expect(s.get("222")).toBe(id);
  expect(readFileSync(f, "utf8")).toContain(id);
});
