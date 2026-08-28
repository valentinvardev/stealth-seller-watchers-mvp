# Watchers sandbox

A runnable copy of the Watchers feature: the real v3 UI from
`stealth-seller-frontend` (dev branch) on top of a standalone tRPC backend, in
one deploy. Built to look at and click through, not to ship.

## What it is

- **UI** — the actual `src/v3/features/watchers` build from the dev branch. Not
  a reconstruction; the page, table, alert feed and create dialog are the ones
  in the product.
- **API** — a small Express + tRPC service that answers the same procedure
  names the real backend exposes (`monitoring.*`), backed by an in-memory store
  instead of Postgres.
- **Auth** — stubbed. There is no sign-in; every visitor is one fixed comped
  admin. See *Caveats*.

## Layout

```
api/[...path].js   Vercel function -> re-exports the compiled Express app
backend/           the API: source in src/, compiled output in dist/
public/            the real v3 frontend build (produced by scripts/)
scripts/           build-frontend.sh -- rebuilds public/ from the frontend repo
verify-local.cjs   rehearses the deploy layout locally
```

`backend/dist` and `public/` are committed on purpose: Vercel then only
installs and runs, with nothing to compile.

## Run it locally

Two ways.

**Against the deployed-style build** (what the deploy serves):

```bash
npm install
node verify-local.cjs        # http://localhost:3010
```

**Against the frontend dev server** (HMR, for actually working on the UI):

```bash
# terminal 1 -- API
cd backend && npm install && npm run build && node dist/server.js   # :3000

# terminal 2 -- the frontend repo
cd ../stealth-seller-frontend
gh auth refresh -s read:packages     # once; see GITHUB_TOKEN_SETUP.md
export GITHUB_TOKEN=$(gh auth token)
npm install --legacy-peer-deps
echo 'VITE_API_URL=http://localhost:3000' > .env.local
npm run dev
```

Then open `/watchers`.

## Rebuilding the UI

After changing the frontend repo:

```bash
export GITHUB_TOKEN=$(gh auth token)
bash scripts/build-frontend.sh
```

That rebuilds `public/`. The script rewrites the baked API origin to
`window.location.origin`, so the bundle is not pinned to one domain and preview
deployments work — see the comment at the top of the script.

## Deploy

Vercel, zero config. `api/` is picked up automatically, `public/` is served as
static, and `vercel.json` adds the SPA fallback. No environment variables are
required.

## What the API implements

Under `monitoring.*`: `listWatches`, `createWatch`, `archiveWatch`,
`snoozeWatch`, `unsnoozeWatch`, `setWatchCadence`, `setWatchThreshold`,
`getCredits`, `getWatcherStatus`, `setWatchersPaused`, `listAlerts`. Plus
`simulateAlert`, which is sandbox-only and fires a synthetic alert so the feed
can be demoed without waiting on a poll.

`account.getMe` and `/api/auth/get-session` exist only to satisfy the
frontend's route guards.

## Caveats

Worth knowing before showing this to anyone:

- **State is in memory.** Watches and alerts live in the function's process and
  are gone on the next cold start. Fine for a walkthrough; do not expect
  anything created to still be there later.
- **There is no auth.** Anyone with the URL is signed in as a comped admin.
  Treat the link as public.
- **Firecrawl is wired but not driving anything.** `backend/src/integrations/firecrawl.ts`
  can scrape a URL for price and stock, but no poller calls it yet — the data
  on screen is seeded, not live.
