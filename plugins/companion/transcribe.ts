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

import { execFile } from "child_process";
import { join } from "path";

const TIMEOUT_MS = 180_000;

/** Exit code the adapter uses when its tools or model are missing. */
const UNAVAILABLE = 3;

let warnedUnavailable = false;

export function transcriberCommand(): string | null {
  const configured = process.env.COMPANION_TRANSCRIBE_CMD;
  if (configured === "off") return null;
  return configured || join(import.meta.dir, "scripts", "transcribe-whisper-cpp.sh");
}

/** False when transcription is off, or the transcriber already said its tools are missing. */
export function transcriptionAvailable(): boolean {
  return transcriberCommand() !== null && !warnedUnavailable;
}

/** Returns the transcript, or undefined when no transcriber is set up or it failed. */
export function transcribe(audioPath: string): Promise<string | undefined> {
  const cmd = transcriberCommand();
  if (!cmd) return Promise.resolve(undefined);
  return new Promise((resolve) => {
    // execFile, never a shell: the path goes to the command as one argument.
    execFile(
      cmd,
      [audioPath],
      { timeout: TIMEOUT_MS, maxBuffer: 1024 * 1024, encoding: "utf8" },
      (err, stdout, stderr) => {
        if (err) {
          const code = (err as NodeJS.ErrnoException & { code?: unknown }).code;
          const unavailable = code === UNAVAILABLE || code === "ENOENT";
          if (!unavailable || !warnedUnavailable) {
            const why = String(stderr || err.message)
              .trim()
              .split("\n")[0];
            process.stderr.write(`companion: transcription unavailable or failed: ${why}\n`);
          }
          if (unavailable) warnedUnavailable = true;
          resolve(undefined);
          return;
        }
        const text = stdout
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean)
          .join(" ")
          .trim();
        resolve(text || undefined);
      },
    );
  });
}
