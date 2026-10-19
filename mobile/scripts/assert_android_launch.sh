#!/usr/bin/env bash
# Physical-device startup regression: use a release APK, not a debug build.
set -eu
ADB="${ADB:-$HOME/Library/Android/sdk/platform-tools/adb}"
APP=dev.vantage.spectator
OUT="${1:-build-logs/android-launch}"
mkdir -p "$OUT"
"$ADB" shell am force-stop "$APP"
# Read only the app's new process; do not collect unrelated phone logs.
"$ADB" shell am start -W -n "$APP/.MainActivity" > "$OUT/start.txt"
sleep 2
PID=$("$ADB" shell pidof "$APP" | tr -d '\r')
[ -n "$PID" ] || { echo 'FAIL: app died during startup'; exit 1; }
"$ADB" logcat --pid="$PID" -d -t 300 > "$OUT/process.txt"
sleep 10
NEXT=$("$ADB" shell pidof "$APP" | tr -d '\r')
[ -n "$NEXT" ] || { echo 'FAIL: app died after launch'; exit 1; }
test "$PID" = "$NEXT" || { echo 'FAIL: process restarted'; exit 1; }
"$ADB" exec-out screencap -p > "$OUT/screen.png"
echo "PASS: release process $PID survived startup; scene/motion acceptance is separate"
