#!/usr/bin/env bash
# ------------------------------------------------------------
# publish-release.sh — create the GitHub release for GENESIS
#
# Usage:
#   bash scripts/publish-release.sh 1.0.0
#   bash scripts/publish-release.sh 1.0.0 --notes "First public build"
#
# Expects these five assets somewhere in the repo or a build
# folder (checked by filename, recursively, max depth 4):
#
#   genesis-windows-x64.geode
#   genesis-macos-universal.geode
#   genesis-android64.geode
#   genesis-android32.geode
#   genesis-ios.geode
#
# Prereleases: a version containing "-" (e.g. 1.1.0-beta.1) is
# published with --prerelease and expects version-prefixed assets:
#   genesis-1.1.0-beta.1-windows-x64.geode  (etc.)
#
# Optional: skip iOS by setting SKIP_IOS=1.
#
# Requires: gh (GitHub CLI), authenticated: gh auth login
# ------------------------------------------------------------
set -euo pipefail

VERSION="${1:-}"
if [[ -z "$VERSION" ]]; then
  echo "usage: bash scripts/publish-release.sh <version>     e.g. 1.0.0" >&2
  exit 1
fi

TAG="v${VERSION}"
NOTES=""
shift || true
while [[ $# -gt 0 ]]; do
  case "$1" in
    --notes) NOTES="${2:-}"; shift 2 ;;
    *) echo "unknown argument: $1" >&2; exit 1 ;;
  esac
done

PREFIX="genesis"
PRERELEASE=0
if [[ "$VERSION" == *-* ]]; then
  PREFIX="genesis-${VERSION}"
  PRERELEASE=1
fi

WANT=(
  "${PREFIX}-windows-x64.geode"
  "${PREFIX}-macos-universal.geode"
  "${PREFIX}-android64.geode"
  "${PREFIX}-android32.geode"
)
if [[ "${SKIP_IOS:-0}" != "1" ]]; then
  WANT+=("${PREFIX}-ios.geode")
fi

echo "→ looking for ${#WANT[@]} assets…"
FOUND=()
MISSING=()
for name in "${WANT[@]}"; do
  hit="$(find . -maxdepth 4 -type f -name "$name" -not -path './.git/*' -print -quit || true)"
  if [[ -n "$hit" ]]; then
    FOUND+=("$hit")
    printf '  ✓ %-34s %s\n' "$name" "$hit"
  else
    MISSING+=("$name")
    printf '  ✗ %-34s not found\n' "$name"
  fi
done

if [[ ${#MISSING[@]} -gt 0 ]]; then
  echo
  echo "Missing ${#MISSING[@]} asset(s): ${MISSING[*]}" >&2
  echo "Build them first (geode build / geode build -p android64 …), or run with SKIP_IOS=1 to ship without iOS." >&2
  exit 1
fi

echo
EXTRA=()
if [[ "$PRERELEASE" == "1" ]]; then
  EXTRA+=(--prerelease)
  echo "→ prerelease detected (${VERSION}) — GitHub will mark it as a pre-release"
fi

echo "→ creating release ${TAG}"
if [[ -n "$NOTES" ]]; then
  gh release create "$TAG" "${FOUND[@]}" --title "GENESIS ${TAG}" --notes "$NOTES" "${EXTRA[@]}"
else
  gh release create "$TAG" "${FOUND[@]}" --title "GENESIS ${TAG}" --generate-notes "${EXTRA[@]}"
fi

echo
echo "✓ released ${TAG}"
if [[ "$PRERELEASE" == "1" ]]; then
  echo "  now set  pending: false  on GENESIS_BETA in releases.js"
  echo "  testers: beta.html  (or download.html?channel=beta)"
else
  echo "  now set  pending: false  on ${TAG} in releases.js"
fi
echo "  https://github.com/BeginnerCoder142011/Genesis/releases/tag/${TAG}"
