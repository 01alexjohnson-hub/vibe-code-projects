# CLAUDE.md

This file provides guidance to Claude Code (and other AI coding assistants) working in this repository.

## What this is

**SpeakEasy** is a fully-local, privacy-hardened macOS voice-dictation app — a fork of
[cjpais/Handy](https://github.com/cjpais/Handy) (MIT). Tauri v2 (Rust) + React/TypeScript. Press a
hotkey, speak, and the transcribed text is typed into whatever app is focused. No cloud, no telemetry,
no account. See `ATTRIBUTION.md` for exactly what changed vs. upstream Handy.

## Sanctioned build/install path

This is **the** path — don't improvise a different one (e.g. a manual `cargo build` or `bun run tauri
build`).

**Prerequisites:** [Rust](https://rustup.rs/), [Bun](https://bun.sh/), `cmake` (`brew install cmake`),
Xcode Command Line Tools (`xcode-select --install`). On **Intel Macs**, also `brew install
onnxruntime` — `scripts/build.sh` auto-detects Intel and links it; it prints this hint and stops if
missing. Apple Silicon needs nothing extra.

```bash
./scripts/build.sh      # bun install + tauri build, correct env baked in
./scripts/install.sh    # → /Applications/SpeakEasy.app, sign, reset stale TCC, launch
```

Then grant **Input Monitoring + Accessibility + Microphone** (macOS prompts on first run/dictation)
and relaunch. Dictate: **tap Option+Space** to start, tap again to stop.

Never swap a plain `cargo build` binary into the `.app` bundle — it runs in dev mode and loads a dev
asset URL that doesn't exist in a packaged run, producing a blank window. Only `bun run tauri build`
(what `build.sh` runs) embeds the frontend.

Default STT is **NVIDIA Parakeet-TDT-0.6b** (ONNX/Metal), not Whisper. `silero_vad_v4.onnx` ships
bundled at `src-tauri/resources/models/` — never curl it. First run downloads Parakeet (~600MB) from
`blob.handy.computer`; if that's unreachable, see the Hugging Face fallback in RUNBOOK.md.

## Where things live

- **Architecture & dependencies:** `HANDOFF.md`
- **Day-to-day operation, troubleshooting, model fallback:** `RUNBOOK.md`
- **Full agent guidance (commands, code style, architecture detail):** `AGENTS.md`
- **Contribution workflow:** `CONTRIBUTING.md`

## Privacy invariants — never regress these

- Egress is locked to a **local** ollama at `127.0.0.1:11434` (only if AI polish is enabled) plus
  user-triggered model downloads. Don't add any other outbound call, cloud LLM preset, or telemetry.
- No auto-updater — it was deliberately removed. Don't reintroduce one.
- No audio or transcripts leave the device. Verify with `./scripts/egress-audit.sh`.

If a task appears to require calling out to a cloud service, stop and flag it rather than adding the
call — that's a privacy-model change, not a routine edit.
