#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
if [[ ! -d ios/Vantage.xcodeproj ]]; then CI=1 npx expo prebuild --platform ios --no-install; fi
if [[ ! -d ios/Vantage.xcworkspace ]]; then (cd ios && pod install); fi
# Local simulator architecture only: this is NOT an iPhone-signed device build.
ARCH="$(uname -m)"
xcodebuild -workspace ios/Vantage.xcworkspace -scheme Vantage \
  -configuration Release -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath ios/build ARCHS="$ARCH" ONLY_ACTIVE_ARCH=YES CODE_SIGNING_ALLOWED=NO -quiet
ARTIFACT="$ROOT/ios/build/Build/Products/Release-iphonesimulator/Vantage.app"
[[ -d "$ARTIFACT" ]] || { echo "Missing simulator artifact: $ARTIFACT" >&2; exit 1; }
mkdir -p builds
rm -rf "$ROOT/builds/Vantage.app"
cp -R "$ARTIFACT" "$ROOT/builds/Vantage.app"
echo "Built simulator app: $ROOT/builds/Vantage.app ($ARCH; not a physical-device build)"
