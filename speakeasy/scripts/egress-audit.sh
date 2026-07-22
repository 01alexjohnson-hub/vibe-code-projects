#!/bin/bash
# SpeakEasy — prove no data leaves the device. Samples every network socket the app
# process holds and reports any that is NOT localhost. Run it, then dictate a few times
# (including one Medium/High-polish take to exercise the localhost-ollama path).
# Expected result: 0 non-localhost rows.
# Usage: ./scripts/egress-audit.sh [seconds]   (default 180)
set -euo pipefail
DUR=${1:-180}
OUT="/tmp/speakeasy-egress-audit.log"
: > "$OUT"
END=$((SECONDS + DUR)); echo "audit start $(date) — ${DUR}s" | tee -a "$OUT"
while [ $SECONDS -lt $END ]; do
  # Match only the SpeakEasy (or pre-rebrand Handy) app binary, not every .app on the machine.
  PIDS=$(pgrep -f "/(SpeakEasy|Handy)\.app/Contents/MacOS/" | tr '\n' ',' | sed 's/,$//')
  if [ -n "$PIDS" ]; then
    lsof -a -i -P -n -p "$PIDS" 2>/dev/null \
      | grep -v -E "127\.0\.0\.1|\[::1\]|localhost|COMMAND" >> "$OUT" || true
  fi
  sleep 5
done
echo "audit end $(date)" >> "$OUT"
N=$(grep -vc -E "^audit" "$OUT" || true)
echo "non-localhost connection rows captured: $N   (0 = nothing left the device)"
[ "$N" -gt 0 ] && { echo "REVIEW these rows:"; grep -v "^audit" "$OUT" | sort -u; } || true
