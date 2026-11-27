/**
 * Voice and audio messages to text, through a command on this machine.
 *
 * Part of the companion plugin, Apache License, Version 2.0 (see LICENSE and NOTICE).
 *
 * Claude cannot listen to audio, so a voice note reaches the session as text only when
 * something on this machine transcribes it first. The command is
 * COMPANION_TRANSCRIBE_CMD (an executable that takes the audio path and prints the
 * transcript), by default the bundled whisper.cpp adapter. Set it to "off" to keep voice
 * notes as attachments. The plugin holds no API key: a cloud transcriber is a command
 * that reads its own key.
 */

import { spawn } from "child_process";
import { rmSync } from "fs";
import { join } from "path";
import { childEnv } from "./redact.ts";

const TIMEOUT_MS = 180_000;
const MAX_OUTPUT_BYTES = 1024 * 1024;

/** Telegram lets a bot download files up to 20 MB, so nothing larger is transcribed. */
export const MAX_AUDIO_BYTES = 20 * 1024 * 1024;

/** Exit code the adapter uses when its tools or model are missing. */
const UNAVAILABLE = 3;

/** Set once the transcriber reported its tools missing: the server stops trying until restart. */
let transcriberMissing = false;

export function transcriberCommand(): string | null {
  const configured = process.env.COMPANION_TRANSCRIBE_CMD;
  if (configured === "off") return null;
  return configured || join(import.meta.dir, "scripts", "transcribe-whisper-cpp.sh");
}

/** False when transcription is off, or the transcriber already said its tools are missing. */
export function transcriptionAvailable(): boolean {
  return transcriberCommand() !== null && !transcriberMissing;
}

/** whisper.cpp marks non-speech as a bracketed tag, such as [BLANK_AUDIO] or (music). */
const NON_SPEECH = /^[[(][^\])]*[\])]$/;

/**
 * Returns the transcript, or undefined when no transcriber is set up, it failed, or it heard
 * no speech. The command runs in a process group of its own, so a timeout ends ffmpeg and
 * whisper with it, and it never sees a token.
 */
export function transcribe(audioPath: string, timeoutMs = TIMEOUT_MS): Promise<string | undefined> {
  const cmd = transcriberCommand();
  if (!cmd) return Promise.resolve(undefined);
  // Neither the bot's token nor Claude's ever reaches the transcriber.
  const env = childEnv();
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let settled = false;
    const finish = (text: string | undefined) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(text);
    };
    const warn = (why: string) =>
      process.stderr.write(`companion: transcription unavailable or failed: ${why}\n`);

    // execFile semantics without a shell: the path goes to the command as one argument.
    const child = spawn(cmd, [audioPath], {
      env,
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const killGroup = (signal: NodeJS.Signals) => {
      try {
        if (child.pid) process.kill(-child.pid, signal);
      } catch {}
    };
    const timer = setTimeout(() => {
      killGroup("SIGTERM");
      setTimeout(() => killGroup("SIGKILL"), 2000).unref();
      warn(`timed out after ${timeoutMs / 1000}s`);
      finish(undefined);
    }, timeoutMs);

    child.stdout.setEncoding("utf8").on("data", (chunk: string) => {
      stdout += chunk;
      if (stdout.length > MAX_OUTPUT_BYTES) {
        killGroup("SIGKILL");
        warn("output too large");
        finish(undefined);
      }
    });
    child.stderr.setEncoding("utf8").on("data", (chunk: string) => {
      if (stderr.length < 4096) stderr += chunk;
    });
    child.on("error", (err: NodeJS.ErrnoException) => {
      if (settled) return;
      if (err.code === "ENOENT") transcriberMissing = true;
      warn(err.message);
      finish(undefined);
    });
    child.on("close", (code) => {
      if (settled) return; // already timed out or cut off
      if (code !== 0) {
        if (!transcriberMissing || code !== UNAVAILABLE)
          warn(stderr.trim().split("\n")[0] || `exit ${code}`);
        if (code === UNAVAILABLE) transcriberMissing = true;
        finish(undefined);
        return;
      }
      const text = stdout
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l && !NON_SPEECH.test(l))
        .join(" ")
        .trim();
      finish(text || undefined);
    });
  });
}

/**
 * Transcribes a voice note or an audio file the gate already let through. Returns the words
 * and removes the downloaded audio, or undefined when it is not audio, is too large, no
 * transcriber is set up, or nothing was heard.
 */
export async function transcribeAttachment(
  attachment: { kind: string; file_id: string; size?: number } | undefined,
  download: (fileId: string) => Promise<string>,
): Promise<string | undefined> {
  if (!attachment || (attachment.kind !== "voice" && attachment.kind !== "audio")) return undefined;
  if ((attachment.size ?? 0) > MAX_AUDIO_BYTES || !transcriptionAvailable()) return undefined;
  const path = await download(attachment.file_id);
  try {
    return await transcribe(path);
  } finally {
    // The words are what the session gets; the recording does not stay on disk.
    rmSync(path, { force: true });
  }
}
