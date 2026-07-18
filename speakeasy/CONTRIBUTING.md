# Contributing to SpeakEasy

Thanks for your interest! SpeakEasy is a privacy-hardened fork of
[Handy](https://github.com/cjpais/Handy) (MIT) — see [ATTRIBUTION.md](ATTRIBUTION.md) for what changed.

## Build & run

Prerequisites: Rust ([rustup.rs](https://rustup.rs)), Bun ([bun.sh](https://bun.sh)),
cmake (`brew install cmake`), Xcode Command Line Tools (`xcode-select --install`).
On Intel Macs also run `brew install onnxruntime`.

```bash
./scripts/build.sh      # build the .app (correct env baked in)
./scripts/install.sh    # install to /Applications, sign, launch
```

More detail: [README.md](README.md) (quick start), [BUILD.md](BUILD.md) (per-platform specifics),
[HANDOFF.md](HANDOFF.md) (architecture), [RUNBOOK.md](RUNBOOK.md) (operations).

## Reporting bugs / requesting features

Open an issue on this repository. Helpful details: OS + CPU (e.g. macOS 14 / Apple M2, or Intel),
app version, clear reproduction steps, expected vs. actual behavior, and logs
(`~/Library/Logs/com.speakeasy.app/handy.log`, or enable debug mode with `Cmd+Shift+D`).

## Pull requests

1. Fork and branch from `main`.
2. Keep changes focused; match the existing code style (Rust `cargo fmt` / `clippy`, TypeScript
   Prettier / ESLint).
3. **Preserve the privacy posture** — no telemetry and no non-localhost network calls. The egress
   lockdown is enforced and tested; verify with `scripts/egress-audit.sh`.
4. Run the tests: `cd src-tauri && TRANSCRIBE_CMAKE_ARGS="-DGGML_NATIVE=OFF" cargo test`, and
   `bun run build` for the frontend.
5. Open a PR against this repository with a clear description.

Translations have their own guide: [CONTRIBUTING_TRANSLATIONS.md](CONTRIBUTING_TRANSLATIONS.md).

## License

MIT — see [LICENSE](LICENSE). Contributions are accepted under the same license.
