#!/usr/bin/env bash
# Aggregate presentation pacing for the INSTALLED Vantage build on a connected phone.
#
# This is an HWUI/compositor aggregate (dumpsys gfxinfo), including shared-GPU
# contention. It is not a Perfetto GPU trace, a GL-thread frame counter or a
# SurfaceFlinger per-frame trace. Compare builds only with the identical
# procedure, scene, device and display mode.
#
# Usage (from mobile/):
#   bash scripts/measure_presentation_pacing.sh ssaa 100
#   adb install -r builds/vantage-before-ssaa.apk
#   bash scripts/measure_presentation_pacing.sh before-ssaa 100
#   adb install -r builds/vantage-ssaa.apk   # restore the accepted build
#
# Requires an unlocked phone with USB debugging authorized. The script launches
# Vantage at a fixed replay state and keeps the screen awake; it restores the
# stay-awake setting afterwards. It does NOT install or restore an APK.
set -euo pipefail

LABEL=${1:?usage: measure_presentation_pacing.sh <label> [seconds]}
DURATION=${2:-100}
ADB=${ADB:-$HOME/Library/Android/sdk/platform-tools/adb}
APP=dev.vantage.spectator
OUT=build-logs/pacing
mkdir -p "$OUT"

"$ADB" get-state >/dev/null 2>&1 || {
  echo "STOP: no authorized device. Connect and unlock the phone first." >&2
  exit 1
}

PREVIOUS_STAY_ON=$("$ADB" shell settings get global stay_on_while_plugged_in | tr -d '\r')
restore_stay_on() {
  if [ -z "$PREVIOUS_STAY_ON" ] || [ "$PREVIOUS_STAY_ON" = "null" ]; then
    "$ADB" shell settings delete global stay_on_while_plugged_in >/dev/null 2>&1 || true
  else
    "$ADB" shell settings put global stay_on_while_plugged_in "$PREVIOUS_STAY_ON" >/dev/null 2>&1 || true
  fi
}
trap restore_stay_on EXIT
"$ADB" shell settings put global stay_on_while_plugged_in 7 >/dev/null

"$ADB" shell am force-stop "$APP"
"$ADB" shell am start -W -a android.intent.action.VIEW \
  -d 'vantage:///?time=0\&driver=18\&camera=follow\&play=1' -p "$APP" >/dev/null
sleep 8

"$ADB" shell dumpsys gfxinfo "$APP" reset >/dev/null
sleep "$DURATION"
"$ADB" shell dumpsys gfxinfo "$APP" > "$OUT/$LABEL-gfxinfo.txt"
"$ADB" exec-out screencap -p > "$OUT/$LABEL-end.png"

{
  echo "label=$LABEL duration=${DURATION}s device=$("$ADB" shell getprop ro.product.model | tr -d '\r')"
  echo "pacing=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  grep -E "Total frames|Janky frames:|50th percentile|90th percentile|95th percentile|99th percentile|Number Missed Vsync|Number Frame deadline missed:|[0-9]+th gpu percentile|Pipeline=" \
    "$OUT/$LABEL-gfxinfo.txt" | head -20
  "$ADB" shell dumpsys battery | grep -E "level|temperature" | head -3
} | tee "$OUT/$LABEL-summary.txt"

echo "Saved $OUT/$LABEL-gfxinfo.txt and $OUT/$LABEL-summary.txt"
echo "This is aggregate HWUI/GPU contention, not a GPU trace or a 60fps claim."
