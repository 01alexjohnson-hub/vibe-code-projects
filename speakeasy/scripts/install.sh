#!/bin/bash
# SpeakEasy — install the built .app to /Applications with a stable-ish signature
# and a clean TCC slate. Solves the "permission granted but app still waiting" trap:
# ad-hoc signatures churn the cdhash each build, so macOS treats old grants as stale.
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$(ls -d "$REPO"/src-tauri/target/release/bundle/macos/*.app 2>/dev/null | head -1)"
APP_NAME="SpeakEasy"
DEST="/Applications/${APP_NAME}.app"
BUNDLE_ID="com.speakeasy.app"   # matches tauri.conf.json identifier
IDENTITY="-"                 # ad-hoc; use a stable self-signed cert to stop TCC re-grant churn

[ -n "$SRC" ] && [ -d "$SRC" ] || { echo "FATAL: no build found — run ./scripts/build.sh first"; exit 1; }

echo "==> Quitting any running copy"
osascript -e "quit app \"$APP_NAME\"" 2>/dev/null || true
sleep 2

echo "==> Installing $SRC → $DEST"
rm -rf "$DEST"; ditto "$SRC" "$DEST"

echo "==> Signing ($IDENTITY) + clearing quarantine"
codesign -s "$IDENTITY" --force --deep "$DEST"
codesign -v --deep "$DEST" && echo "    signature valid"
xattr -dr com.apple.quarantine "$DEST" 2>/dev/null || true

echo "==> Resetting stale TCC records for $BUNDLE_ID"
for SVC in Accessibility ListenEvent Microphone; do tccutil reset "$SVC" "$BUNDLE_ID" 2>/dev/null || true; done

echo "==> Launching (Finder context, required for first-run permission prompts)"
open "$DEST"
cat <<EOF

GRANT ONCE in System Settings → Privacy & Security, then relaunch:
  • Input Monitoring  (+ add $DEST)   — global hotkey
  • Accessibility                      — paste into other apps
  • Microphone         (prompts on 1st dictation)
Use it: TAP the hotkey (default Option+Space) to start, TAP again to stop. Esc cancels.
EOF
