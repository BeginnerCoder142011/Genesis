#!/usr/bin/env bash
# ------------------------------------------------------------
# cleanup-repo.sh — remove the stray root files left by the
# earlier drag-and-drop uploads, and move the level file into
# levels/ so it isn't published at the site root.
#
# The Creao GitHub connector can create and update files but has
# no delete operation, so this has to run from a machine where
# the GitHub CLI is authenticated:
#
#   gh auth login
#   bash scripts/cleanup-repo.sh
#
# Requires: gh (GitHub CLI). Nothing else.
# ------------------------------------------------------------
set -euo pipefail

REPO="${REPO:-BeginnerCoder142011/Genesis}"
BRANCH="${BRANCH:-main}"

say() { printf '\n\033[1m%s\033[0m\n' "$*"; }

sha_of() {
  gh api "repos/${REPO}/contents/$1?ref=${BRANCH}" --jq .sha
}

delete_path() {
  local path="$1" enc="${1// /%20}" sha
  if ! sha="$(sha_of "$enc" 2>/dev/null)"; then
    echo "  –  $path (already gone)"
    return 0
  fi
  gh api -X DELETE "repos/${REPO}/contents/$path" \
    -f message="Remove stray upload: ${path}" \
    -f sha="$sha" -f branch="$BRANCH" >/dev/null
  echo "  ✓  deleted $path"
}

say "1. Deleting stray root files"
delete_path "styles (1).css"
delete_path "styles (2).css"
delete_path "README (1).md"
delete_path "pages.yml"
delete_path "publish-release.sh"

say "2. Moving pulse.gmd into levels/"
if sha="$(sha_of "pulse.gmd" 2>/dev/null)"; then
  content="$(gh api "repos/${REPO}/contents/pulse.gmd?ref=${BRANCH}" --jq .content | tr -d '\n')"
  gh api -X PUT "repos/${REPO}/contents/levels/pulse.gmd" \
    -f message="Move level file into levels/" \
    -f content="$content" -f branch="$BRANCH" >/dev/null
  echo "  ✓  created levels/pulse.gmd"
  gh api -X DELETE "repos/${REPO}/contents/pulse.gmd" \
    -f message="Move level file into levels/ (remove root copy)" \
    -f sha="$sha" -f branch="$BRANCH" >/dev/null
  echo "  ✓  deleted root pulse.gmd"
else
  echo "  –  pulse.gmd not at root (already moved?)"
fi

say "Done. Root should now be:"
gh api "repos/${REPO}/contents/?ref=${BRANCH}" --jq '.[].name' | sed 's/^/  /'

echo
echo "Pages redeploys automatically on the next push to ${BRANCH}.";
echo "Check https://beginnercoder142011.github.io/Genesis/ in ~1 minute."
