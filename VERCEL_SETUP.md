# Vercel Deployment Setup

## Quick Vercel Deploy

### Step 1: Connect to Vercel

```bash
vercel login
vercel link
```

Or via dashboard: https://vercel.com/new

### Step 2: Set Environment Variables

In Vercel Dashboard → Settings → Environment Variables:

```
FIRECRAWL_API_KEY = [From Will - see Slack]
OPENROUTER_API_KEY = [From Will - see Slack]
VITE_API_URL = https://stealth-seller-watchers-mvp.vercel.app
NODE_ENV = production
```

### Step 3: Deploy

```bash
vercel --prod
```

Or push to GitHub and Vercel will auto-deploy.

---

## Deployment URL Map

```
Frontend: https://stealth-seller-watchers-mvp.vercel.app
Backend:  https://stealth-seller-watchers-mvp.vercel.app/trpc
```

---

## What Happens on Deploy

1. **Backend** (Node.js serverless functions)
   - Builds TypeScript
   - Runs on Vercel Functions
   - Accessible at `/trpc/*`

2. **Frontend** (React + Vite)
   - Builds static assets
   - Deployed to CDN
   - Routes to `/trpc/*` go to backend

3. **APIs Connected**
   - Firecrawl: Scrapes URLs for real data
   - OpenRouter: AI evaluation (ready for custom_ai watches)

---

## Testing After Deploy

```bash
# Check backend health
curl https://stealth-seller-watchers-mvp.vercel.app/health

# Check frontend loads
curl https://stealth-seller-watchers-mvp.vercel.app | head -20

# Test tRPC API
curl -X POST https://stealth-seller-watchers-mvp.vercel.app/trpc/listWatches \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

## Troubleshooting Vercel

### Build fails with "Module not found"
- Run `npm install` locally to verify
- Check that all imports use correct paths
- Verify backend/src/ and frontend/src/ exist

### API returns 500 error
- Check Environment Variables are set
- Look at Vercel Function logs
- Verify FIRECRAWL_API_KEY and OPENROUTER_API_KEY are valid

### Frontend shows 404
- Verify build output in `frontend/dist/`
- Check that `index.html` exists
- Vercel routes should fallback to index.html

### CORS errors in frontend
- Add VITE_API_URL to environment
- Verify CORS middleware in backend/src/server.ts
- Check that requests go to `/trpc/` not `/api/trpc/`

---

## Environment Variables Reference

| Variable | Value | Where |
|----------|-------|-------|
| FIRECRAWL_API_KEY | `fc-1f1a49...` | Firecrawl (URL scraping) |
| OPENROUTER_API_KEY | `sk-or-v1-...` | OpenRouter (AI evaluation) |
| VITE_API_URL | `https://...vercel.app` | Frontend → Backend routing |
| NODE_ENV | `production` | Server runtime |
| PORT | `3000` | Vercel assigns automatically |

---

## Live Demo

Once deployed:

```
Frontend: https://stealth-seller-watchers-mvp.vercel.app
GitHub:   https://github.com/valentinvardev/stealth-seller-watchers-mvp
```

Share this with William to try the MVP live!

---

## Rollback

If something breaks:

1. Go to Vercel Dashboard
2. Select project
3. Go to "Deployments"
4. Find last known-good deployment
5. Click "Rollback"

---

## Next Steps

After testing:
1. Collect feedback from William
2. Integrate with production frontend (stealth-seller-frontend)
3. Add PostgreSQL database
4. Set up real email notifications
5. Deploy to staging environment
