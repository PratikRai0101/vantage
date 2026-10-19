#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
if ! java -version >/dev/null 2>&1; then
  echo 'Android build needs a working JDK (set JAVA_HOME; use the JDK version required by this Expo/Gradle SDK).' >&2
  exit 1
fi
if [[ ! -f android/gradlew ]]; then CI=1 npx expo prebuild --platform android --no-install; fi
(cd android && ./gradlew assembleRelease)
ARTIFACT="$ROOT/android/app/build/outputs/apk/release/app-release.apk"
[[ -f "$ARTIFACT" ]] || { echo "Missing APK: $ARTIFACT" >&2; exit 1; }
mkdir -p builds
cp "$ARTIFACT" "$ROOT/builds/vantage-replay.apk"
echo "Built local testing APK: $ROOT/builds/vantage-replay.apk"
echo 'Local signing is not Play Store signing. Do not submit this artifact.'
