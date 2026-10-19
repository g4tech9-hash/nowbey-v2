#!/usr/bin/env bash
# Build the NowBey Android APK on the machine running this script, with Gradle — no EAS.
#
# This is the fallback path of the mobile pipeline:
#   * `.github/workflows/deploy.yml` (`build-apk`) runs it automatically when EAS refuses the
#     build, errors on the worker, or is skipped (the `mobile-fallback` dispatch target), so a
#     `mobile` dispatch still ends with an installable APK;
#   * `.github/workflows/build.yml` runs it by hand from the Actions tab.
#
# What it does: `expo prebuild` generates `expo/android/`, then `./gradlew assembleRelease`.
# The release build type in the generated project is signed with the generated debug keystore,
# which is what makes the APK installable on a test device. That is *not* a Play Store upload
# key and this script never produces an AAB — NowBey ships direct APKs only.
#
# Runner requirements: Node 20+, JDK 17+, the Android SDK (`ANDROID_HOME`/`ANDROID_SDK_ROOT`),
# `expo/node_modules` (`npm ci` in `expo/`) and `expo/google-services.json` (written from the
# `FIREBASE_GOOGLE_SERVICES_JSON` repository secret; git-ignored).
#
# Usage: scripts/build-apk-local.sh [--skip-prebuild]
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
expo="$root/expo"
apk_rel="android/app/build/outputs/apk/release/app-release.apk"
apk="$expo/$apk_rel"

# The API base is baked into the JS bundle by Metro, which the release build runs inside Gradle.
export EXPO_PUBLIC_API_BASE="${EXPO_PUBLIC_API_BASE:-https://nowbey-v2.vercel.app}"

log() { printf '\n== %s\n' "$*"; }
die() { printf 'build-apk-local: %s\n' "$*" >&2; exit 1; }

# --- toolchain -------------------------------------------------------------------------------
command -v node >/dev/null 2>&1 || die "node is required"
command -v java >/dev/null 2>&1 || die "java is required (JDK 17+); the workflow installs it with actions/setup-java"

# GitHub's ubuntu runners export ANDROID_HOME; a developer machine may not. Fall back to the
# usual install locations rather than failing with Gradle's much less useful "SDK location
# not found".
if [ -z "${ANDROID_HOME:-}" ] && [ -z "${ANDROID_SDK_ROOT:-}" ]; then
  for candidate in "$HOME/Android/Sdk" /usr/local/lib/android/sdk /opt/android-sdk "$HOME/Library/Android/sdk"; do
    if [ -d "$candidate" ]; then
      ANDROID_HOME="$candidate"
      break
    fi
  done
fi
if [ -n "${ANDROID_HOME:-}" ]; then
  export ANDROID_SDK_ROOT="$ANDROID_HOME"
  export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"
elif [ -n "${ANDROID_SDK_ROOT:-}" ]; then
  export ANDROID_HOME="$ANDROID_SDK_ROOT"
fi
[ -n "${ANDROID_HOME:-}" ] || die "no Android SDK: set ANDROID_HOME (the GitHub runner has one preinstalled)"

# --- inputs ----------------------------------------------------------------------------------
[ -d "$expo/node_modules/expo" ] || die "expo/node_modules is missing; run 'npm ci' in expo/ first"
[ -s "$expo/google-services.json" ] || die "expo/google-services.json is missing; it comes from the FIREBASE_GOOGLE_SERVICES_JSON secret (never commit it)"

# --- generate the native project -------------------------------------------------------------
if [ "${1:-}" = "--skip-prebuild" ]; then
  log "skipping expo prebuild (--skip-prebuild)"
else
  log "expo prebuild (Android) in $expo"
  ( cd "$expo" && ./node_modules/.bin/expo prebuild --platform android --no-install )
fi
[ -f "$expo/android/gradlew" ] || die "expo prebuild did not generate expo/android/gradlew"

# --- compile ---------------------------------------------------------------------------------
# --no-daemon keeps the build inside this process (the CI runner is thrown away afterwards) and
# the explicit heap stops Gradle from sizing its daemon off the runner's total memory.
log "gradle assembleRelease"
(
  cd "$expo/android"
  chmod +x gradlew
  ./gradlew assembleRelease \
    --no-daemon \
    --stacktrace \
    -Dorg.gradle.jvmargs="-Xmx4096m -XX:MaxMetaspaceSize=1024m"
)

[ -s "$apk" ] || die "gradle finished but $apk_rel is missing or empty"

# --- result ----------------------------------------------------------------------------------
size_bytes="$(wc -c < "$apk" | tr -d ' ')"
size_mb=$((size_bytes / 1024 / 1024))
log "APK ready: $apk (${size_mb} MB, ${size_bytes} bytes)"

# If apksigner ships with this SDK, say which key signed the APK. Best effort only: an APK
# Gradle just produced is valid whether or not this tool is on the box.
if command -v apksigner >/dev/null 2>&1; then
  apksigner verify --print-certs "$apk" 2>/dev/null | head -5 || true
else
  apksigner_bin="$(ls -1 "$ANDROID_HOME"/build-tools/*/apksigner 2>/dev/null | tail -1 || true)"
  if [ -n "$apksigner_bin" ]; then
    "$apksigner_bin" verify --print-certs "$apk" 2>/dev/null | head -5 || true
  fi
fi

if [ -n "${GITHUB_OUTPUT:-}" ]; then
  {
    echo "apk=$apk"
    echo "apk_size=$size_bytes"
  } >> "$GITHUB_OUTPUT"
fi
if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
  {
    echo "### APK built locally with Gradle (fallback)"
    echo ""
    echo "| | |"
    echo "| --- | --- |"
    echo "| APK | \`$apk_rel\` |"
    echo "| Size | ${size_mb} MB |"
    echo "| Commit | \`${GITHUB_SHA:-local}\` |"
    echo "| API base | \`$EXPO_PUBLIC_API_BASE\` |"
  } >> "$GITHUB_STEP_SUMMARY"
fi
