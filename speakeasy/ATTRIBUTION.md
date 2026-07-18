# Attribution

SpeakEasy is a fork of **[Handy](https://github.com/cjpais/Handy)** by CJ Pais, used under the MIT
License. The original license and copyright notice are retained in [`LICENSE`](LICENSE) as MIT requires.
The majority of the application framework, the audio/STT engines, and the base UI come from Handy.

## What SpeakEasy changed
- **Privacy/egress lockdown:** removed all cloud LLM provider presets; forced any post-processing
  base_url to localhost; removed the auto-updater and update-checker (no phone-home); neutralized
  outbound HTTP headers; verified zero telemetry and zero non-localhost egress during use.
- **Polish pipeline:** added a deterministic text-cleanup pass (filler-word / repeated-word / casing
  fixes, unit-tested) plus optional *local* ollama LLM polish tiers with a hard timeout that falls back
  to the deterministic result so a slow model never blocks output.
- **macOS defaults hardened from live testing:** default keyboard engine set to Tauri global-shortcut
  (the HID engine did not capture keys on macOS 26); default paste mode set to clipboard-copy (fixes an
  Electron paste race); toggle dictation mode; tuned paste delays.
- **UI/design:** reskinned Hub/Settings/overlay (minimal/Swiss, Plus Jakarta Sans, self-hosted fonts),
  added a React error boundary and settings-load-failure fallback, accessibility and contrast fixes.
- **Spacebar push-to-talk:** opt-in hold-spacebar mode with tap-vs-hold detection and a secure-input guard.

## Upstream components (all retained from Handy / its ecosystem)
- Handy — application base (MIT) — https://github.com/cjpais/Handy
- transcribe-rs / transcribe-cpp — STT engines (by CJ Pais)
- NVIDIA Parakeet-TDT, OpenAI Whisper — speech models
- Silero VAD — voice activity detection
- Tauri, and the Rust/JS crates listed in `HANDOFF.md`

If you build on SpeakEasy, please keep this attribution and the `LICENSE` file intact, and credit both
SpeakEasy and Handy.
