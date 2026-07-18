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

# Intel Macs (x86_64) have no prebuilt ONNX Runtime — link Homebrew's dynamically.
# (Apple Silicon uses the crate's bundled ORT and skips this entirely.)
if [ "$(uname -m)" = "x86_64" ]; then
  ORT_PREFIX="$(brew --prefix onnxruntime 2>/dev/null || true)"
  [ -n "$ORT_PREFIX" ] && [ -d "$ORT_PREFIX/lib" ] || {
    echo "FATAL: Intel Mac needs ONNX Runtime → brew install onnxruntime"; exit 1; }
  export ORT_LIB_LOCATION="$ORT_PREFIX/lib"
  export ORT_PREFER_DYNAMIC_LINK=1
  echo "==> Intel Mac detected: linking Homebrew ONNX Runtime ($ORT_LIB_LOCATION)"
fi

cd "$REPO"
echo "==> bun install"
bun install
echo "==> tauri build (embedded assets — NEVER a plain 'cargo build' binary; that runs in dev mode)"
bun run tauri build --bundles app
echo "==> Built: $REPO/src-tauri/target/release/bundle/macos/*.app"
echo "    Next: ./scripts/install.sh"
