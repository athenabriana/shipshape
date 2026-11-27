#!/usr/bin/env bash
# Transcribes one audio file with whisper.cpp and prints the text.
# Part of the companion plugin, Apache License, Version 2.0.
#
#   transcribe-whisper-cpp.sh AUDIO_FILE
#
# Needs whisper-cli (whisper.cpp) and ffmpeg on PATH, and a ggml model at
# COMPANION_WHISPER_MODEL (default: ~/.local/share/whisper-cpp/ggml-small.bin).
# COMPANION_WHISPER_LANG picks the language (default: auto).
# Exits 3 when a tool or the model is missing, so the server stays quiet about it.
set -euo pipefail

in="${1:?usage: transcribe-whisper-cpp.sh AUDIO_FILE}"
model="${COMPANION_WHISPER_MODEL:-${XDG_DATA_HOME:-$HOME/.local/share}/whisper-cpp/ggml-small.bin}"
lang="${COMPANION_WHISPER_LANG:-auto}"

bin="$(command -v whisper-cli || command -v whisper-cpp || true)"
[ -n "$bin" ] || { echo "whisper-cli not found on PATH" >&2; exit 3; }
command -v ffmpeg >/dev/null || { echo "ffmpeg not found on PATH" >&2; exit 3; }
[ -f "$model" ] || { echo "whisper model not found: $model" >&2; exit 3; }

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
# whisper.cpp reads 16 kHz mono WAV; Telegram voice notes are Ogg Opus.
ffmpeg -nostdin -loglevel error -i "$in" -ar 16000 -ac 1 -c:a pcm_s16le "$tmp/audio.wav"
"$bin" -m "$model" -l "$lang" --no-timestamps --no-prints -f "$tmp/audio.wav" 2>/dev/null
