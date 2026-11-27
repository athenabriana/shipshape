#!/usr/bin/env bash
# Transcribes one audio file with whisper.cpp and prints the text.
# Part of the companion plugin, Apache License, Version 2.0.
#
#   transcribe-whisper-cpp.sh AUDIO_FILE
#
# Needs ffmpeg on PATH, a ggml model at COMPANION_WHISPER_MODEL (default:
# ~/.local/share/whisper-cpp/ggml-small.bin), and whisper.cpp's CLI: the path in
# COMPANION_WHISPER_BIN, else `whisper-cli` on PATH, else the older name
# `whisper-cpp` on PATH.
# COMPANION_WHISPER_LANG picks the language (default: auto).
# Exits 3 when a tool or the model is missing, so the server stays quiet about it.
set -euo pipefail

in="${1:?usage: transcribe-whisper-cpp.sh AUDIO_FILE}"
model="${COMPANION_WHISPER_MODEL:-${XDG_DATA_HOME:-$HOME/.local/share}/whisper-cpp/ggml-small.bin}"
lang="${COMPANION_WHISPER_LANG:-auto}"

bin="${COMPANION_WHISPER_BIN:-$(command -v whisper-cli || command -v whisper-cpp || true)}"
[ -n "$bin" ] && [ -x "$bin" ] || { echo "whisper-cli not found (set COMPANION_WHISPER_BIN or put it on PATH)" >&2; exit 3; }
command -v ffmpeg >/dev/null || { echo "ffmpeg not found on PATH" >&2; exit 3; }
[ -f "$model" ] || { echo "whisper model not found: $model" >&2; exit 3; }

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
# A signal ends the script through the EXIT trap, so the temporary audio is removed.
trap 'exit 143' TERM INT
# whisper.cpp reads 16 kHz mono WAV; Telegram voice notes are Ogg Opus.
ffmpeg -nostdin -loglevel error -protocol_whitelist file -i "$in" -ar 16000 -ac 1 -c:a pcm_s16le "$tmp/audio.wav"
"$bin" -m "$model" -l "$lang" --no-timestamps --no-prints -f "$tmp/audio.wav" 2>/dev/null
