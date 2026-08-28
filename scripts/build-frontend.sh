#!/usr/bin/env bash
# Builds the real v3 frontend (stealth-seller-frontend, dev branch) into public/
# so the sandbox ships one deploy with the actual Stealth Seller UI.
#
# Why the placeholder dance: Vite inlines VITE_API_URL at build time, so the API
# origin is normally frozen into the bundle. That would pin the build to one
# Vercel URL and break every preview deployment. Instead we build with a unique
# sentinel host and rewrite it to window.location.origin, which makes the bundle
# origin-relative -- correct on any domain, since the API is served from the same
# deploy under /api.
#
# The rewrite drops the opening quote too, so both shapes stay valid JS:
#   "https://SENTINEL/api/trpc"  ->  window.location.origin+"/api/trpc"
#   "https://SENTINEL"           ->  window.location.origin+""
set -euo pipefail

SENTINEL="https://PLACEHOLDER.vercel.app"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND="${FRONTEND_REPO:-$HERE/../stealth-seller-frontend}"

if [ ! -d "$FRONTEND" ]; then
  echo "error: frontend repo not found at $FRONTEND" >&2
  echo "set FRONTEND_REPO to override" >&2
  exit 1
fi

echo "==> building $FRONTEND (needs GITHUB_TOKEN for the private types package)"
cd "$FRONTEND"
VITE_API_URL="$SENTINEL" npm run build

echo "==> rewriting the API origin to window.location.origin"
# Match the full sentinel host, not the bare word: rrweb ships an unrelated
# "SCRIPT_PLACEHOLDER" literal that would otherwise look like a failed rewrite.
BEFORE=$(grep -ro "PLACEHOLDER\.vercel\.app" build/assets | wc -l | tr -d ' ')
find build/assets -name '*.js' -exec \
  perl -pi -e 's{"https://PLACEHOLDER\.vercel\.app}{window.location.origin+"}g' {} +
AFTER=$(grep -ro "PLACEHOLDER\.vercel\.app" build/assets | wc -l | tr -d ' ')
echo "    occurrences: $BEFORE -> $AFTER"
if [ "$AFTER" != "0" ]; then
  echo "error: sentinel still present after rewrite" >&2
  exit 1
fi

echo "==> copying into $HERE/public"
rm -rf "$HERE/public"
mkdir -p "$HERE/public"
cp -r build/. "$HERE/public/"

echo "done. public/ now holds the real v3 build."
