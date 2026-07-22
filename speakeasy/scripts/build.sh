#!/bin/bash
# SpeakEasy — the one sanctioned build command.
# Encodes every build requirement so the wrong invocation can't happen.
# See HANDOFF.md "Build gotchas". Run from anywhere; resolves the repo via its own path.
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export PATH="$HOME/.bun/bin:$HOME/.cargo/bin:/usr/local/bin:/opt/homebrew/bin:$PATH"
# CLT clang rejects ggml's -mcpu=native; this is transcribe-cpp's escape hatch (Metal/NEON unaffected).
export TRANSCRIBE_CMAKE_ARGS="-DGGML_NATIVE=OFF"

command -v cmake >/dev/null || { echo "FATAL: cmake missing → brew install cmake"; exit 1; }
command -v bun   >/dev/null || { echo "FATAL: bun missing → https://bun.sh"; exit 1; }
command -v cargo >/dev/null || { echo "FATAL: cargo/rust missing → https://rustup.rs"; exit 1; }

# Intel Macs (x86_64) are a manual, not-yet-automated build path — fail fast, don't guess.
# `brew install onnxruntime` is PROVEN not to work: Homebrew's Intel ORT bottle caps at 1.23.2,
# but ort's default api-24 feature (pulled in via BOTH transcribe-rs and vad-rs) hard-requires
# ONNX Runtime 1.24+ — which has no x86_64-apple-darwin prebuilt anywhere. The fix is to pin ort
# back to api-23 via vendored transcribe-rs/vad-rs overrides + a [patch.crates-io] block, which
# were proven on a one-off Intel build but NOT committed here. Until they are, stop with a pointer
# to the real recipe instead of attempting the broken Homebrew path.
# (Apple Silicon uses the crate's bundled ORT and skips this entirely.)
if [ "$(uname -m)" = "x86_64" ]; then
  echo "FATAL: Intel Mac (x86_64) build is not automated in this repo." >&2
  echo "  Do NOT 'brew install onnxruntime' — it's proven not to work (ORT 1.24+ requirement)." >&2
  echo "  Follow BUILD.md → 'Intel Mac (x86_64)': redo the vendor/transcribe-rs + vendor/vad-rs" >&2
  echo "  api-23 overrides, then verify with:" >&2
  echo "      cargo tree -e features -i ort | grep -E 'api-24|download-binaries'   (expect no output)" >&2
  exit 1
fi

cd "$REPO"
echo "==> bun install"
bun install
echo "==> tauri build (embedded assets — NEVER a plain 'cargo build' binary; that runs in dev mode)"
bun run tauri build --bundles app
echo "==> Built: $REPO/src-tauri/target/release/bundle/macos/*.app"
echo "    Next: ./scripts/install.sh"
