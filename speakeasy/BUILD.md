# Build Instructions

This guide covers how to set up the development environment and build SpeakEasy from source across
different platforms.

**Sanctioned path (macOS):** `./scripts/build.sh` followed by `./scripts/install.sh` — see the Quick
start in README.md or CLAUDE.md. It runs `bun install` + `bun run tauri build` with the correct
platform env already baked in, so most people on Apple Silicon never need the manual commands on
this page. This page documents what the script does and how to build manually if you're not using it
(e.g. CI, a non-macOS platform, or debugging the script itself). **Intel Macs** are a manual,
not-yet-automated path — see [Intel Mac (x86_64)](#intel-mac-x86_64) below; the script fails fast
there rather than attempting the (broken) Homebrew ONNX Runtime path.

macOS is the only platform this fork is tested on. The Windows/Linux detail below is inherited from
upstream Handy and kept for reference — it's unverified in this fork.

## Prerequisites

### All Platforms

- [Rust](https://rustup.rs/) (latest stable)
- [Bun](https://bun.sh/) package manager
- [Tauri Prerequisites](https://tauri.app/start/prerequisites/)

### Platform-Specific Requirements

#### macOS

- Xcode Command Line Tools
- Install with: `xcode-select --install`

##### Intel Mac (x86_64)

Apple Silicon needs nothing extra — the `ort` crate downloads a prebuilt ONNX Runtime and the
`scripts/build.sh` fast path just works.

**Intel is a manual, not-yet-automated path.** Do not use `brew install onnxruntime` — it is proven
not to work. Homebrew's Intel ONNX Runtime bottle tops out at 1.23.2, but the `ort` crate's default
`api-24` feature (pulled in transitively via **both** `transcribe-rs` and `vad-rs`) hard-requires
ONNX Runtime **1.24+** at build time (no `x86_64-apple-darwin` prebuilt for it exists anywhere) and
at runtime (`ort` rejects older dylibs it does find). This ceiling is ecosystem-wide: Microsoft's
GitHub releases, PyPI wheels, and conda-forge all cap macOS x86_64 at 1.22–1.23.2. A newer brew
formula will not appear — the fix is to pin `ort` back to `api-23`, not to chase a newer runtime.

`scripts/build.sh`'s Intel branch **fails fast** and points here rather than attempting the broken
Homebrew path. To build on Intel today, you must reproduce the validated approach below by hand.

**Validated on real Intel hardware (from-scratch build + install + transcription):**

1. **No Homebrew, no root.** cmake, Node, and ONNX Runtime install as relocatable tarballs under
   `$HOME` — important because a machine with no `sudo` password cannot run the Homebrew installer
   at all.
   - **cmake 3.31.x specifically** — use the official Kitware tarball, **not** 4.x. cmake 4 drops
     `cmake_minimum_required(<3.5)` compatibility that the ggml / whisper.cpp-era builds still need.
   - **Node** — any recent LTS tarball under `$HOME`.
   - **ONNX Runtime 1.23.2** — Microsoft's prebuilt `osx-x86_64` release tarball.

2. **Verify the feature union before building — this is the trap.** Cargo unions features across the
   whole dependency graph, so pinning `api-23` on only one `ort` consumer (e.g. `transcribe-rs`) is
   not enough if another consumer (`vad-rs`, the Silero VAD) still pulls in `ort`'s default features
   and re-enables `api-24`. Always run:

   ```bash
   cargo tree -e features -i ort | grep -E 'api-24|download-binaries'
   ```

   Expect **no output**. Skipping this check surfaces the failure ~35 minutes into a release build
   instead of before it starts.

3. **Copy the dylib and add a relative rpath.** A dynamically-linked ORT build needs its dylib
   copied into `Contents/Frameworks/` and an `@executable_path/../Frameworks` rpath added via
   `install_name_tool` — **relative, never absolute** (an absolute rpath bakes a personal filesystem
   path into a shipped binary). `ort-sys` only does this copy inside its `download-binaries` flow,
   which the Intel path disables, so without this manual step the bundle ships with a dangling
   `@rpath` reference and fails **at launch**, not at first transcription.

4. **Use a local self-signed certificate, not ad-hoc signing.** Ad-hoc signing (`codesign -s -`)
   changes its cdhash on every rebuild, which silently invalidates TCC's Input Monitoring /
   Accessibility / Microphone grants each time (the "permission is ON but the app still says
   waiting" trap). A local self-signed **code-signing certificate** — imported to the login keychain
   and referenced by `install.sh` — gives a stable identity across rebuilds. It does **not** need to
   be trusted by the OS: `codesign` only needs the private key, and Gatekeeper is not involved for a
   locally-built app.

> **Not yet automated.** The `vendor/transcribe-rs` + `vendor/vad-rs` overrides and the
> `[patch.crates-io]` block that actually pin `api-23` were authored and proven on a one-off Intel
> build but were **never committed to this repo**. Until they are, reproduce the vendoring yourself
> and run the `cargo tree` check in step 2. `scripts/build.sh` will not silently attempt a broken
> build on Intel — it stops and points back here.

#### Windows

- Microsoft C++ Build Tools: Visual Studio 2019/2022 with C++ development
  tools, or Visual Studio Build Tools 2019/2022
- [CMake](https://cmake.org/download/) (must be on `PATH`):

  ```powershell
  winget install Kitware.CMake
  ```

- [Vulkan SDK](https://vulkan.lunarg.com/sdk/home) from LunarG — required to
  build the Vulkan GPU backend (`vulkan-shaders-gen` needs the SDK's headers
  and `glslc`):

  ```powershell
  winget install KhronosGroup.VulkanSDK
  ```

  Open a new terminal afterward so `VULKAN_SDK` is set.

> [!NOTE]
> Windows' 260-character path limit used to break the native Vulkan build in
> most checkouts. Since `transcribe-cpp` 0.1.3 the build works around it
> automatically (it compiles through a short NTFS junction — no admin rights
> or setup needed), so a normal checkout just builds. If you still hit
> path-limit errors, see
> [Windows build fails with path-limit errors](#windows-build-fails-with-path-limit-errors-msb3491--ftk1011--msb6003)
> in Troubleshooting.

#### Linux

- Build essentials
- ALSA development libraries
- Install with:

  ```bash
  # Ubuntu/Debian
  sudo apt update
  sudo apt install build-essential libasound2-dev pkg-config libssl-dev libvulkan-dev vulkan-tools glslc spirv-headers glslang-tools libgtk-3-dev libwebkit2gtk-4.1-dev libayatana-appindicator3-dev librsvg2-dev libgtk-layer-shell0 libgtk-layer-shell-dev patchelf cmake

  # Fedora/RHEL
  sudo dnf groupinstall "Development Tools"
  sudo dnf install alsa-lib-devel pkgconf openssl-devel vulkan-devel \
    spirv-headers-devel spirv-tools-devel glslang glslc \
    gtk3-devel webkit2gtk4.1-devel libappindicator-gtk3-devel librsvg2-devel \
    gtk-layer-shell gtk-layer-shell-devel \
    cmake

  # Arch Linux
  sudo pacman -S base-devel alsa-lib pkgconf openssl vulkan-devel \
    spirv-headers glslang shaderc \
    gtk3 webkit2gtk-4.1 libappindicator-gtk3 librsvg gtk-layer-shell \
    cmake
  ```

## Setup Instructions

You already have the source tree (this repo) — no clone step needed.

### 1. Install Dependencies

```bash
bun install
```

### 2. Start Dev Server

```bash
bun tauri dev
```

### 3. Build for Production

```bash
bun run tauri build
```

This compiles a release binary and generates platform-specific bundles (deb, rpm, AppImage on Linux; dmg on macOS; msi on Windows). On macOS, prefer `./scripts/build.sh` + `./scripts/install.sh` (see top of this page) over running these commands by hand.

## Linux Install (from source)

*Unverified in this fork — inherited from upstream Handy, kept for reference.*

The raw binary (`src-tauri/target/release/speakeasy`) cannot run standalone — it needs Tauri resource files (tray icons, sounds, VAD model) to be co-located at the expected path.

**Install from the deb bundle** (works on any Linux distro):

```bash
cd /tmp
ar x /path/to/repo/src-tauri/target/release/bundle/deb/SpeakEasy_*_amd64.deb data.tar.gz
tar xzf data.tar.gz
sudo cp usr/bin/speakeasy /usr/bin/
sudo cp -a usr/lib/. /usr/lib/
sudo cp -r usr/share/icons/hicolor/* /usr/share/icons/hicolor/
sudo cp usr/share/applications/SpeakEasy.desktop /usr/share/applications/
sudo ldconfig
```

After subsequent rebuilds, copy the binary and any refreshed runtime libraries:

```bash
sudo cp src-tauri/target/release/speakeasy /usr/bin/
sudo cp -a src-tauri/transcribe-libs/. /usr/lib/
sudo ldconfig
```

Resources only need re-copying if they change upstream (new icons, sounds, models, etc.).

## Troubleshooting

*The sections below are Windows/Linux-specific — unverified in this fork, kept for reference.*

### AppImage build fails on Arch / rolling-release distros

`linuxdeploy` bundles its own `strip` binary which is too old to process system libraries built with newer toolchains on rolling-release distros (Arch, CachyOS, Manjaro, EndeavourOS).

The error from Tauri:

```
Bundling SpeakEasy_*_amd64.AppImage
failed to bundle project `failed to run linuxdeploy`
```

Tauri swallows the real linuxdeploy error. To see it, run linuxdeploy manually:

```bash
cd src-tauri/target/release/bundle/appimage
~/.cache/tauri/linuxdeploy-x86_64.AppImage --appimage-extract-and-run \
  --appdir SpeakEasy.AppDir --plugin gtk --output appimage
```

**Workaround:** The binary, deb, and rpm bundles all build fine — only the AppImage step fails. To skip it:

```bash
bun run tauri build -- --bundles deb
```

Then install using the deb extraction method above.

### Windows build fails with path-limit errors (`MSB3491` / `FTK1011` / `MSB6003`)

On Windows the native build can fail partway through `transcribe-cpp-sys` with
any of these (all the same root cause):

```
error MSB3491: Could not write lines to file "...VCTargetsPath.tlog\VCTargetsPath.lastbuildstate".
Path: ... exceeds the OS max path limit. The fully qualified file name must be less than 260 characters.
```

```
FileTracker : error FTK1011: could not create the new file tracking log file:
...\vulkan-shaders-gen-build\...\cmTC_xxxxx.tlog\link.write.1.tlog.
The system cannot find the path specified.
```

```
error MSB6003: The specified task executable "CL.exe" could not be run.
System.IO.DirectoryNotFoundException: Could not find a part of the path ...
```

This is **not** a code or toolchain problem — it's Windows' legacy 260-character
path limit (`MAX_PATH`), overflowed by the Vulkan shader generator's nested
CMake build tree on top of Cargo's already-deep
`target\release\build\<crate>-<hash>\out\build\...` directory.

Since `transcribe-cpp` 0.1.3 this is mitigated automatically: the native build
compiles through a short NTFS junction under `%LOCALAPPDATA%\tcs` (created
without admin rights), so a normal checkout builds with no setup. Enabling
Windows long paths does **not** reliably help here — MSBuild's native
`FileTracker` (`tracker.exe`) ignores the long-paths flag — which is why the
junction, not the registry flag, is the fix.

If you still see the errors above, junction creation was likely blocked
(filesystem or corporate policy) — the failing build's log then contains a
`transcribe-cpp-sys: could not create short build junction ...` warning — or
your checkout is deep enough to overflow even the shortened layout. Work
around either case with a short Cargo target directory:

```powershell
# Per-shell:
$env:CARGO_TARGET_DIR = "C:\h"

# Or persist it for all future terminals (note: redirects ALL your
# Rust projects' build output, not just this one):
[Environment]::SetEnvironmentVariable('CARGO_TARGET_DIR', 'C:\h', 'User')
```

Artifacts then land in `C:\h\release\...` instead of the repo's
`src-tauri\target\`. Open a **new terminal** if you persisted the variable —
it is only picked up by freshly started processes. Then `bun run tauri dev`
and `bun run tauri build` work normally.

### Windows `tauri build` fails at bundling with `program not found`

If the build compiles all the way to `Built application at: ...\speakeasy.exe` and
then fails with:

```
Signing C:\...\speakeasy.exe with a custom signing command
failed to bundle project `program not found`
```

that's the code-signing step: `tauri.conf.json` configures a custom
`signCommand` (`trusted-signing-cli`, Azure Trusted Signing) that only exists
in the release CI environment. Local development doesn't need it:

```powershell
# Development (no bundling/signing at all):
bun run tauri dev

# Or compile a release binary without the installer/signing step:
bun run tauri build --no-bundle
```
