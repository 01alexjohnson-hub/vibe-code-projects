# SpeakEasy — Operations Runbook

Fully-local macOS dictation app. Fork of [Handy](https://github.com/cjpais/Handy) (Tauri v2 + Rust +
React). Architecture & dependencies: [HANDOFF.md](HANDOFF.md).

## Build & install (the sanctioned path)
```bash
./scripts/build.sh      # bun install + tauri build (correct env baked in)
./scripts/install.sh    # → /Applications/SpeakEasy.app, sign, reset stale TCC, launch
```
NEVER `cargo build` + swap the binary into the .app — a plain cargo build runs in dev mode and loads a
dev asset URL that doesn't exist in a packaged run → **blank window**. Only `bun run tauri build`
(what build.sh runs) embeds the frontend.

The first build is slow (native STT compile) and can be OOM-killed on low-RAM machines; free memory
(quit heavy apps / stop model daemons) and re-run — the Rust cache makes retries fast.

## First-run permissions (grant ONCE)
System Settings → Privacy & Security:
1. **Input Monitoring** — click +, add `/Applications/SpeakEasy.app`, toggle ON  (global hotkey)
2. **Accessibility** — toggle ON  (paste into other apps)
3. **Microphone** — prompts on first dictation; approve
Relaunch after granting. **If it says "waiting" with the toggle already ON**, the grant went stale from
a rebuild (ad-hoc signatures change identity each build):
```bash
tccutil reset Accessibility com.speakeasy.app
tccutil reset ListenEvent   com.speakeasy.app
tccutil reset Microphone    com.speakeasy.app
```
then relaunch and re-grant. (install.sh does this reset for you.)

## Using it
- **Toggle mode (default):** TAP Option+Space to start, TAP again to stop. Esc cancels. The pill at
  screen-bottom shows idle · recording (waveform) · transcribing.
- Hotkey, mode (toggle/hold), polish level, and model are all in the in-app Settings (Hub → Settings).
- First run: pick the **Parakeet** model in Settings → it downloads once (~630 MB), then works offline.
- **If the download fails** (e.g. `blob.handy.computer` unreachable): point the in-app model manager
  at the canonical Hugging Face repo **`csukuangfj/sherpa-onnx-nemo-parakeet-tdt-0.6b-v2-int8`**, or
  download it yourself and place the extracted files at
  `~/Library/Application Support/com.speakeasy.app/models/parakeet-tdt-0.6b-v2-int8/`.

## Key defaults (in src-tauri/src/settings.rs)
- Keyboard engine = **Tauri global-shortcut** on macOS (the HID engine doesn't capture on macOS 26).
- Paste = **copy-to-clipboard** (no clipboard-restore race in Electron apps like VS Code).
- Dictation = **toggle**; polish = **light** (deterministic, instant). STT = Parakeet.

## Troubleshooting
| Symptom | Cause | Fix |
|---|---|---|
| Blank window, no error | dev-mode binary (plain cargo) | rebuild via `scripts/build.sh` |
| Hotkey does nothing | HID engine / Input Monitoring not granted | keyboard engine = Tauri (default) + grant Input Monitoring |
| Pastes the wrong/old text | clipboard restore race | paste mode = copy-to-clipboard (default) |
| "Permission on but still waiting" | stale TCC after rebuild | `tccutil reset …` + re-grant |
| STT silent / model error | model missing/unselected | pick Parakeet in Settings; it downloads once |
| AI polish freezes | slow local LLM on a weak box | it's timeout-guarded → falls back to Light; keep Light |

Watch the whole record→transcribe→paste chain live:
```bash
tail -f ~/Library/Logs/com.speakeasy.app/handy.log
```

## Verify nothing leaves your device
```bash
./scripts/egress-audit.sh 180   # then dictate a few times; expect 0 non-localhost rows
```
Or the definitive test: turn Wi-Fi OFF, dictate, confirm it still works.
