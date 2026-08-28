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
#
# The `|| true` matters: grep exits 1 on zero matches, and under `set -euo
# pipefail` that killed the script SILENTLY right here -- after the rewrite,
# before the copy -- leaving public/ stale while looking like a success. Zero
# matches is a legitimate count, not an error.
count_sentinel() { { grep -ro "PLACEHOLDER\.vercel\.app" build/assets || true; } | wc -l | tr -d ' '; }
BEFORE=$(count_sentinel)
find build/assets -name '*.js' -exec \
  perl -pi -e 's{"https://PLACEHOLDER\.vercel\.app}{window.location.origin+"}g' {} +
AFTER=$(count_sentinel)
echo "    occurrences: $BEFORE -> $AFTER"
if [ "$AFTER" != "0" ]; then
  echo "error: sentinel still present after rewrite" >&2
  exit 1
fi

echo "==> copying into $HERE/public"
# Merge, don't replace: hashed chunks from PREVIOUS deploys stay in place. A
# tab that was open before a deploy lazy-loads chunks by its own old hashes;
# deleting them turns every redeploy into a "reload page" error screen for
# anyone mid-session. Content-hashed files never conflict, so keeping them is
# always correct -- only the root files (index.html etc.) are replaced.
mkdir -p "$HERE/public"
if ! find "$HERE/public" -maxdepth 1 -type f -delete; then
  echo "error: could not clear public/ root files -- stop anything serving it" >&2
  exit 1
fi
cp -r build/. "$HERE/public/"

WANT=$(grep -oE 'assets/index-[A-Za-z0-9_-]+\.js' build/index.html | head -1)
GOT=$(grep -oE 'assets/index-[A-Za-z0-9_-]+\.js' "$HERE/public/index.html" | head -1)
if [ "$WANT" != "$GOT" ]; then
  echo "error: public/ holds $GOT but the build produced $WANT" >&2
  exit 1
fi

# Storage guard: the sandbox redeploys many times a day and browser state
# written under one build (legacy-bridge user blobs, half-written keys from a
# crashed tab) can throw inside a provider on the next one -- an error only
# clients with history ever see, which is why headless probes stay green.
# On a build change, wipe the origin's storage before the app boots. Keyed to
# the entry hash; the app's CSP allows 'unsafe-inline', so this is valid.
BUILD_KEY=$(basename "$GOT" .js)
# Injected with node, not perl/sed: escaping braces and quotes through two
# shell layers once left literal backslashes in the script and a silent
# syntax error -- the guard parsed as nothing and never ran. Node also
# re-parses the injected script so a broken guard fails the build here.
BUILD_KEY="$BUILD_KEY" node -e '
const fs = require("fs");
const file = process.argv[1];
const key = process.env.BUILD_KEY;
const guard = "<script>/*sandbox-storage-guard*/try{var k=\"__sandbox_build\";if(localStorage.getItem(k)!==\"" + key + "\"){localStorage.clear();sessionStorage.clear();localStorage.setItem(k,\"" + key + "\");}}catch(e){}</script>";
new Function(guard.replace(/^<script>|<\/script>$/g, "")); // throws on a syntax error
let html = fs.readFileSync(file, "utf8").replace(/<script>\/\*sandbox-storage-guard\*\/[\s\S]*?<\/script>/, "");
if (!html.includes("<head>")) throw new Error("no <head> in index.html");
fs.writeFileSync(file, html.replace("<head>", "<head>" + guard));
' "$HERE/public/index.html"
grep -q "sandbox-storage-guard" "$HERE/public/index.html" || { echo "error: storage guard not injected" >&2; exit 1; }

echo "done. public/ now holds the real v3 build ($GOT, storage guard keyed to $BUILD_KEY)."
