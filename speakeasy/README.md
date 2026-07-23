# SpeakEasy

**Fully-local voice dictation for macOS. Press a hotkey, speak, and your words are typed into whatever
app you're in — with zero cloud, zero telemetry, zero account.**

Speak into Chrome, your terminal, your editor, notes — anywhere you can type. Transcription runs
entirely on your own machine (Apple-Silicon accelerated), filler words like "um" and "uh" are cleaned
up automatically, and nothing you say ever leaves your device.

## Features

- 🎙️ **Hotkey dictation** — tap Option+Space to start, tap again to stop. A pill shows recording state.
- ⚡ **On-device STT** — NVIDIA Parakeet (ONNX/Metal), ~8–15× real-time, sub-second results.
- ✨ **Automatic cleanup** — removes filler words, collapses repeats, fixes caps/spacing. Optional
  local-AI polish (grammar, false-starts) via a local [ollama](https://ollama.com) server.
- 🔒 **Private by construction** — no telemetry, no analytics, no cloud. The only network use is a
  _local_ ollama server (only if you turn on AI polish) and model downloads you explicitly start.
  Verify it yourself: `./scripts/egress-audit.sh`.
- 🖥️ **Works in any app** — Chrome, Electron apps, terminals, native apps.

## Quick start

```bash
# prerequisites: Rust (rustup.rs), Bun (bun.sh), cmake (brew install cmake), Xcode CLT
./scripts/build.sh      # build the app
./scripts/install.sh    # install to /Applications, launch
```

Then grant **Input Monitoring + Accessibility + Microphone** once (macOS prompts you), pick the
Parakeet model in Settings, and start dictating. Full walkthrough + troubleshooting: **[RUNBOOK.md](RUNBOOK.md)**.
Developer/handoff detail (architecture, dependencies): **[HANDOFF.md](HANDOFF.md)**.

Intel Macs (x86_64) build via a manual, not-yet-automated path — see BUILD.md → "Intel Mac
(x86_64)". Do **not** `brew install onnxruntime` (proven not to work); `scripts/build.sh` stops on
Intel with a pointer to the recipe. If the first-run model download fails, RUNBOOK.md has a Hugging
Face fallback.

## Privacy

SpeakEasy makes no cloud calls and collects no data. Audio is transcribed in-process by a local model.
The app holds zero network connections at rest; during dictation it makes zero non-localhost
connections. Recordings are stored locally only (for history playback) and never uploaded — you can set
retention or disable it in Settings. `scripts/egress-audit.sh` reproducibly proves the no-egress claim.

## Acknowledgements

SpeakEasy is built on **[Handy](https://github.com/cjpais/Handy)** by CJ Pais — an excellent open-source,
offline speech-to-text app (MIT). SpeakEasy is a privacy-hardened, reskinned fork; see
[ATTRIBUTION.md](ATTRIBUTION.md) for what changed. Handy's speech-to-text engines
([transcribe-rs](https://github.com/cjpais/transcribe-rs)) and the underlying models
(NVIDIA Parakeet, OpenAI Whisper, Silero VAD) make this possible.

## License

MIT — see [LICENSE](LICENSE). Original copyright © 2025 CJ Pais (Handy); SpeakEasy modifications under
the same MIT license.
