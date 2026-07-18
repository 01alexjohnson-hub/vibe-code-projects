# SpeakEasy — Project Handoff

Fully-local, privacy-first voice dictation for macOS. Press a hotkey, speak, and your words are typed
into whatever app is focused — Chrome, terminals, editors, notes, anything. 100% on-device: no cloud,
no telemetry, no account.

> **SpeakEasy is built on [Handy](https://github.com/cjpais/Handy)** by CJ Pais (MIT). It is a
> privacy-hardened, reskinned fork. See `ATTRIBUTION.md` for exactly what changed. The original MIT
> license is retained in `LICENSE`.

---

## 1. What it does
- **Hotkey dictation** — tap Option+Space (default) to start, tap again to stop (toggle mode); a pill
  overlay shows idle / recording / transcribing. Types the result into the focused app.
- **On-device STT** — NVIDIA Parakeet-TDT-0.6b (ONNX, Apple-Silicon Metal): ~8–15× real-time,
  sub-second turnaround, accurate in normal room noise.
- **Automatic cleanup ("polish")** — deterministic removal of filler words ("um/uh"), repeated words,
  and capitalization/spacing fixes by default; optional local-LLM polish (grammar / false-start
  resolution) via a local [ollama](https://ollama.com) server, hang-proofed by a hard timeout.
- **Private by construction** — zero telemetry, zero analytics, no cloud calls. The only network paths
  are (a) a local ollama server at `127.0.0.1:11434` (only if you enable Medium/High polish) and (b)
  model downloads you explicitly trigger. Everything else is local. Prove it: `scripts/egress-audit.sh`.

## 2. Platform & status
- **Tested:** macOS 26.5, Apple Silicon (M2). Built with Command Line Tools only (no full Xcode).
- **Version:** 0.9.3 (inherited from the Handy base). Tauri 2.11.5.
- Windows/Linux code paths exist (from Handy) but are unverified in this fork.

## 3. Dependencies
### System (install once)
| Tool | Why | Install |
|---|---|---|
| Rust (stable) | builds the Tauri/Rust core + native STT engines | https://rustup.rs |
| Bun | JS package manager + frontend build | https://bun.sh |
| cmake | builds `transcribe-cpp-sys` (whisper.cpp native) | `brew install cmake` |
| Xcode Command Line Tools | clang/codesign | `xcode-select --install` |
| ollama *(optional)* | only for Medium/High LLM polish | https://ollama.com |

### Rust crates (src-tauri/Cargo.toml — key ones)
`tauri` 2.11 (+ plugins: store, os, clipboard-manager, macos-permissions, fs, process, dialog, log,
opener) · `transcribe-rs` + `transcribe-cpp` (STT engines) · `vad-rs` (Silero VAD) · `cpal` +
`rodio` + `hound` + `rubato` (audio) · `enigo` + `rdev` + `handy-keys` (input/injection) · `reqwest`
(localhost ollama + model downloads only) · `rusqlite` + `rusqlite_migration` (history db) · `hf-hub`
(model fetch) · `specta`/`tauri-specta` (TS bindings) · `regex`/`strsim`/`natural` (polish).

### JS deps (package.json)
React 18 + Vite + Tailwind · `zustand` (state) · `@fontsource/plus-jakarta-sans` (self-hosted font,
no CDN) · `lucide-react` (icons) · `i18next`/`react-i18next` · `react-markdown` · `sonner` (toasts) ·
`@tauri-apps/api` + plugins. (The auto-updater was removed — no `@tauri-apps/plugin-updater`.)

### Model (not in the repo — ~630 MB)
Parakeet-TDT-0.6b-v2 (int8 ONNX). Downloaded on demand by the in-app **model manager** into the app
data dir (`~/Library/Application Support/<bundle-id>/models/`), never committed. The download source is
currently Handy's host (`blob.handy.computer`) / Hugging Face via `hf-hub`. **Fork note:** to be fully
independent of upstream infra, mirror the model to your own host or point at the canonical Hugging Face
repo `csukuangfj/sherpa-onnx-nemo-parakeet-tdt-0.6b-v2-int8`.

## 4. Build / install / run
```bash
./scripts/build.sh      # bun install + tauri build (correct env baked in)
./scripts/install.sh    # → /Applications/SpeakEasy.app, sign, reset stale TCC, launch
```
Then grant **Input Monitoring + Accessibility + Microphone** once (see RUNBOOK.md), pick the Parakeet
model in Settings, and dictate. Full operations detail: `RUNBOOK.md`.

### Build gotchas (baked into scripts/build.sh)
- **Never `cargo build` + swap the binary** — a plain cargo build runs in DEV mode and loads a
  nonexistent dev asset URL → blank window. Only `bun run tauri build` embeds the frontend.
- `TRANSCRIBE_CMAKE_ARGS="-DGGML_NATIVE=OFF"` is required (CLT clang rejects ggml's `-mcpu=native`).
- `cmake` must be installed.

## 5. Architecture (what lives where)
- **`src-tauri/src/`** (Rust core): `actions.rs` (record→transcribe→paste flow) · `polish.rs`
  (deterministic cleanup + tests) · `llm_client.rs` (localhost-only ollama client, hard timeout) ·
  `settings.rs` (all settings + hardened defaults) · `clipboard.rs` (text injection) · `shortcut/`
  (hotkey engines: Tauri global-shortcut default on macOS, handy-keys opt-in, spacebar-PTT opt-in) ·
  `managers/{model,transcription,history,audio}.rs` · `overlay.rs` (pill) · `voice`/`audio_toolkit`.
- **`src/`** (React frontend): `components/hub/` (Home / Dictionary / History / Settings) ·
  `overlay/` (recording pill) · `stores/settingsStore.ts` · `bindings.ts` (generated Rust↔TS) ·
  `styles/theme.css` (design system) · `components/ErrorBoundary.tsx` (resilience).
- **`scripts/`** build / install / egress-audit. **`RUNBOOK.md`** operations.

## 6. What this fork changed vs Handy (see ATTRIBUTION.md for detail)
- **Egress lockdown** — removed all cloud LLM presets; base_url forced to localhost; tauri updater +
  update-checker removed (no phone-home); neutral outbound headers; zero telemetry.
- **Polish pipeline** — new `polish.rs`: deterministic filler/repetition/caps cleanup (unit-tested) +
  optional local-ollama LLM tiers with a hard timeout that degrades to deterministic (never blocks paste).
- **Hardened macOS defaults** — Tauri keyboard engine (handy-keys HID doesn't capture on macOS 26);
  `copy_to_clipboard` paste mode (fixes an Electron paste race); toggle dictation mode; paste delays.
- **UI/design system** — reskinned Hub/Settings/pill (Swiss/minimal, Plus Jakarta Sans), self-hosted
  fonts, `ErrorBoundary` + settings-load-failure fallback, accessibility (focus rings, reduced-motion),
  WCAG-checked palette.
- **Spacebar-PTT** — opt-in hold-spacebar mode with tap-vs-hold + secure-input guard.

## 7. Testing
- Rust: `cd src-tauri && TRANSCRIBE_CMAKE_ARGS="-DGGML_NATIVE=OFF" cargo test` → 144 tests (polish,
  think-strip, egress/localhost enforcement, LLM timeout, settings defaults).
- Frontend: `bun run build` (tsc + vite) must be clean.
- Live: `scripts/egress-audit.sh` while dictating → 0 non-localhost rows.

## 8. Privacy / no-traceability (verified)
- 0 open network sockets at idle; 0 non-localhost egress during dictation; no analytics SDK.
- No secrets, no PII, no personal paths in tracked files.
- **If you publish your own fork,** scrub git commit metadata (the author email is the one place
  identity leaks) and remove any CI that references infrastructure you don't own.

## 9. Known issues / remaining work
- **Model isn't bundled** — a fresh install must download Parakeet once (in-app). Bundling it into app
  resources would make the install fully standalone/offline-from-first-run.
- **Rebrand is done** — bundle id is `com.speakeasy.app`, the compiled binary is `speakeasy`, and
  user-facing strings say SpeakEasy throughout.
- **Ad-hoc signing** → permission grants don't persist across rebuilds: macOS TCC ties a grant to the
  binary's code signature (`cdhash`), and ad-hoc signing mints a new one every build, silently revoking
  Input Monitoring/Accessibility/Microphone each time. Use a **stable self-signed identity** (a
  Keychain code-signing cert you create once and reuse) instead of ad-hoc (`codesign -s -`), so the
  `cdhash` — and the grant — survives rebuilds. `scripts/install.sh` resets stale TCC as a stopgap;
  a stable identity avoids needing that reset at all.
- Model download depends on upstream Handy host — mirror it for independence (§3).
- Windows/Linux unverified in this fork.
- Local-LLM polish is slow on low-RAM/CPU machines (timeout-guarded; Light polish is the fast default).
