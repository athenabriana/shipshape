import { afterEach, expect, test } from "bun:test";
import { chmodSync, mkdtempSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

import { transcribe, transcriberCommand } from "../transcribe.ts";

const dir = mkdtempSync(join(tmpdir(), "companion-transcribe-"));

function fakeCommand(body: string): string {
  const path = join(dir, `cmd-${Math.random().toString(36).slice(2)}.sh`);
  writeFileSync(path, `#!/bin/sh\n${body}\n`);
  chmodSync(path, 0o755);
  return path;
}

afterEach(() => {
  delete process.env.COMPANION_TRANSCRIBE_CMD;
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
