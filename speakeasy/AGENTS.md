# AGENTS.md

This file provides guidance to AI coding assistants working with code in this repository.

**SpeakEasy** is a privacy-hardened fork of [cjpais/Handy](https://github.com/cjpais/Handy) (MIT) — a
fully-local macOS voice-dictation app (Tauri v2 + Rust + React). See `CLAUDE.md` for the short version
and privacy invariants, `HANDOFF.md` for full architecture/dependencies, `RUNBOOK.md` for operations.

## Development Commands

**Prerequisites:**

- [Rust](https://rustup.rs/) (latest stable)
- [Bun](https://bun.sh/) package manager
- `cmake` (`brew install cmake`)
- Xcode Command Line Tools (`xcode-select --install`)
- Intel Macs (x86_64): a manual, not-yet-automated path — **not** `brew install onnxruntime` (proven
  not to work). `scripts/build.sh` fails fast on Intel; see BUILD.md → "Intel Mac (x86_64)".

**Sanctioned build/install** (see BUILD.md for full platform detail):

```bash
./scripts/build.sh      # bun install + tauri build, correct env baked in
./scripts/install.sh    # → /Applications/SpeakEasy.app, sign, reset stale TCC, launch
```

**Iterating during development:**

```bash
bun install
bun run tauri dev              # full app, dev mode
CMAKE_POLICY_VERSION_MINIMUM=3.5 bun run tauri dev  # if cmake errors on macOS

bun run dev                     # frontend only (Vite)
bun run build                   # build frontend (TypeScript + Vite)
bun run preview                 # preview built frontend
```

No manual model setup is required — `silero_vad_v4.onnx` ships bundled at
`src-tauri/resources/models/`. The STT model (Parakeet) downloads on first run via the in-app model
manager.

**Linting and Formatting (run before committing):**

```bash
bun run lint              # ESLint for frontend
bun run lint:fix          # ESLint with auto-fix
bun run format            # Prettier + cargo fmt
bun run format:check      # Check formatting without changes
bun run format:frontend   # Prettier only
bun run format:backend    # cargo fmt only
```

For detailed platform-specific build setup, see [BUILD.md](BUILD.md).

## Architecture Overview

Tauri 2.x desktop app: Rust backend + React/TypeScript frontend.

### Backend Structure (src-tauri/src/)

- `lib.rs` - Main entry point, Tauri setup, manager initialization
- `actions.rs` - record → transcribe → paste flow
- `polish.rs` - deterministic filler/repetition/caps cleanup (unit-tested)
- `llm_client.rs` - localhost-only ollama client for optional AI polish, hard timeout
- `settings.rs` - application settings + hardened privacy defaults
- `clipboard.rs` - text injection
- `shortcut/` - hotkey engines (Tauri global-shortcut default on macOS, handy-keys opt-in,
  spacebar-PTT opt-in)
- `managers/` - core business logic: `audio.rs`, `model.rs`, `transcription.rs`, `history.rs`
- `audio_toolkit/` - low-level audio processing (device enumeration, recording, resampling, Silero VAD)
- `commands/` - Tauri command handlers for frontend communication
- `cli.rs` - CLI argument definitions (clap derive)
- `overlay.rs` - recording overlay window (the pill)
- `signal_handle.rs` - `send_transcription_input()` reusable function
- `utils.rs` - platform detection helpers

### Frontend Structure (src/)

- `components/hub/` - Home / Dictionary / History / Settings UI
- `overlay/` - recording overlay (pill) entry point
- `components/ErrorBoundary.tsx` - resilience / settings-load-failure fallback
- `hooks/useSettings.ts` - settings state management hook
- `stores/settingsStore.ts` - Zustand store for settings
- `bindings.ts` - auto-generated Tauri type bindings (via tauri-specta)
- `lib/types.ts` - shared TypeScript type definitions

### Key Architecture Patterns

**Manager Pattern:** Core functionality organized into managers (Audio, Model, Transcription) initialized at startup and managed via Tauri state.

**Command-Event Architecture:** Frontend → Backend via Tauri commands; Backend → Frontend via events.

**Pipeline Processing:** Audio → VAD → Parakeet/Whisper → Text output → Clipboard/Paste

**State Flow:** Zustand → Tauri Command → Rust State → Persistence (tauri-plugin-store)

### Technology Stack

**Core Libraries:**

- `transcribe-rs` - ONNX speech recognition (Parakeet, Moonshine, SenseVoice, etc.) — the default engine
- `transcribe-cpp` - local Whisper-family inference (GGML/GGUF) with GPU acceleration
- `cpal` - cross-platform audio I/O
- `vad-rs` - Voice Activity Detection
- `rdev` - global keyboard shortcuts
- `rubato` - audio resampling
- `rodio` - audio playback for feedback sounds

### Application Flow

1. **Initialization:** App starts minimized to tray, loads settings, initializes managers
2. **Model Setup:** First run downloads the default STT model, **Parakeet-TDT-0.6b** (ONNX), via the
   in-app model manager (~600MB). See RUNBOOK.md for the Hugging Face fallback if the primary host is
   unreachable.
3. **Recording:** Global shortcut triggers audio recording with VAD filtering
4. **Processing:** Audio sent to the STT model for transcription, then optional polish
5. **Output:** Text pasted to the focused application via system clipboard

### Settings System

Settings are stored using Tauri's store plugin with reactive updates:

- Keyboard shortcuts (configurable, supports push-to-talk)
- Audio devices (microphone/output selection)
- STT model preference (Parakeet by default; other `transcribe-rs`/`transcribe-cpp` models available)
- Polish level (deterministic Light by default; optional local-LLM Medium/High via ollama)
- Audio feedback and translation options

### Single Instance Architecture

The app enforces single instance behavior — launching when already running brings the settings window to front rather than creating a new process. Remote control flags (`--toggle-transcription`, etc.) work by launching a second instance that sends args to the running instance via `tauri_plugin_single_instance`, then exits.

## Internationalization (i18n)

All user-facing strings must use i18next translations. ESLint enforces this (no hardcoded strings in JSX).

**Adding new text:**

1. Add key to `src/i18n/locales/en/translation.json`
2. Use in component: `const { t } = useTranslation(); t('key.path')`

**File structure:**

```
src/i18n/
├── index.ts           # i18n setup
├── languages.ts       # Language metadata
└── locales/
    ├── en/translation.json  # English (source)
    ├── de/, es/, fr/, ja/, ru/, zh/, ...
    └── ...
```

For translation contribution guidelines, see [CONTRIBUTING_TRANSLATIONS.md](CONTRIBUTING_TRANSLATIONS.md).

## Code Style

**Rust:**

- Run `cargo fmt` and `cargo clippy` before committing
- Handle errors explicitly (avoid unwrap in production)
- Use descriptive names, add doc comments for public APIs

**TypeScript/React:**

- Strict TypeScript, avoid `any` types
- Functional components with hooks
- Tailwind CSS for styling
- Path aliases: `@/` → `./src/`

## CLI Parameters

SpeakEasy supports command-line parameters on macOS for integration with scripts and autostart configurations.

**Implementation:** `cli.rs` (definitions), `main.rs` (parsing), `lib.rs` (applying), `signal_handle.rs` (shared logic)

| Flag                     | Description                                                |
| ------------------------ | ---------------------------------------------------------- |
| `--toggle-transcription` | Toggle recording on/off on a running instance              |
| `--toggle-post-process`  | Toggle recording with post-processing on/off               |
| `--cancel`               | Cancel the current operation on a running instance         |
| `--start-hidden`         | Launch without showing the main window (tray icon visible) |
| `--no-tray`              | Launch without system tray (closing window quits the app)  |
| `--debug`                | Enable debug mode with verbose (Trace) logging             |

**Key design decisions:**

- CLI flags are runtime-only overrides — they do NOT modify persisted settings
- Remote control flags work via `tauri_plugin_single_instance`: second instance sends args, then exits
- `send_transcription_input()` in `signal_handle.rs` is shared between signal handlers and CLI

## Debug Mode

Access debug features: `Cmd+Shift+D` (macOS)

## Platform Notes

SpeakEasy is developed and verified on **macOS** (Apple Silicon; Intel is a manual, not-yet-automated
build — see BUILD.md → "Intel Mac (x86_64)", **not** `brew install onnxruntime`). Handy's Windows/Linux code paths
still exist in this fork but are **unverified** here — treat any Windows/Linux instructions in
BUILD.md as inherited-but-untested platform knowledge, not a supported target.

## Troubleshooting

See [RUNBOOK.md](RUNBOOK.md) for day-to-day operation and troubleshooting, including the model
download fallback.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) for the development workflow, commit conventions
(conventional commit prefixes: `feat:`, `fix:`, `docs:`, `refactor:`, `chore:` — focus the message on
_why_, not _what_), and code style guidelines.

## Privacy invariants (do not regress)

- Egress locked to a **local** ollama (`127.0.0.1:11434`, only if AI polish is enabled) plus
  user-triggered model downloads. No other outbound calls, no cloud LLM presets, no telemetry.
- No auto-updater (deliberately removed).
- No audio/transcripts persisted off-device.
