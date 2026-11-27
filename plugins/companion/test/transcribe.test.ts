import { afterEach, beforeEach, expect, test } from "bun:test";
import { chmodSync, existsSync, mkdtempSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

import { transcribe, transcribeAttachment, transcriberCommand } from "../transcribe.ts";

const dir = mkdtempSync(join(tmpdir(), "companion-transcribe-"));

function fakeCommand(body: string): string {
  const path = join(dir, `cmd-${Math.random().toString(36).slice(2)}.sh`);
  writeFileSync(path, `#!/bin/sh\n${body}\n`);
  chmodSync(path, 0o755);
  return path;
}

// Restore whatever the runner had, so a developer's own setting neither breaks these
// tests nor leaks out of them.
const original = process.env.COMPANION_TRANSCRIBE_CMD;
beforeEach(() => {
  delete process.env.COMPANION_TRANSCRIBE_CMD;
});
afterEach(() => {
  if (original === undefined) delete process.env.COMPANION_TRANSCRIBE_CMD;
  else process.env.COMPANION_TRANSCRIBE_CMD = original;
});

test("defaults to the bundled whisper.cpp adapter, and 'off' turns it off", () => {
  expect(transcriberCommand()).toEndWith(join("scripts", "transcribe-whisper-cpp.sh"));
  process.env.COMPANION_TRANSCRIBE_CMD = "off";
  expect(transcriberCommand()).toBeNull();
});

test("passes the audio path as one argument and joins the printed lines", async () => {
  process.env.COMPANION_TRANSCRIBE_CMD = fakeCommand('printf " oi, tudo bem?\\n\\n  $1 \\n"');
  expect(await transcribe("/tmp/a b; rm -rf x.ogg")).toBe("oi, tudo bem? /tmp/a b; rm -rf x.ogg");
});

test("returns undefined when the command fails or prints nothing", async () => {
  process.env.COMPANION_TRANSCRIBE_CMD = fakeCommand("echo broken >&2; exit 1");
  expect(await transcribe("/tmp/x.ogg")).toBeUndefined();
  process.env.COMPANION_TRANSCRIBE_CMD = fakeCommand("exit 0");
  expect(await transcribe("/tmp/x.ogg")).toBeUndefined();
});

test("drops non-speech tags, and keeps the bot token from the transcriber", async () => {
  process.env.TELEGRAM_BOT_TOKEN = "123:secret";
  process.env.COMPANION_TRANSCRIBE_CMD = fakeCommand(
    'printf "[BLANK_AUDIO]\\n(music)\\ntoken=${TELEGRAM_BOT_TOKEN:-none}\\n"',
  );
  expect(await transcribe("/tmp/x.ogg")).toBe("token=none");
  delete process.env.TELEGRAM_BOT_TOKEN;
});

test("a timeout ends the transcriber's children too", async () => {
  const marker = join(dir, `child-${Date.now()}`);
  // The grandchild would write the marker after 1 s; the group kill at 200 ms stops it.
  process.env.COMPANION_TRANSCRIBE_CMD = fakeCommand(`(sleep 1; touch ${marker}) & wait`);
  expect(await transcribe("/tmp/x.ogg", 200)).toBeUndefined();
  await Bun.sleep(1500);
  expect(existsSync(marker)).toBe(false);
});

test("transcribeAttachment removes the audio once it has the words", async () => {
  process.env.COMPANION_TRANSCRIBE_CMD = fakeCommand('echo "oi"');
  const audio = join(dir, "note.oga");
  const words = await transcribeAttachment({ kind: "voice", file_id: "f" }, async () => {
    writeFileSync(audio, "x");
    return audio;
  });
  expect(words).toBe("oi");
  expect(existsSync(audio)).toBe(false);
  expect(
    await transcribeAttachment({ kind: "document", file_id: "f" }, async () => audio),
  ).toBeUndefined();
});
