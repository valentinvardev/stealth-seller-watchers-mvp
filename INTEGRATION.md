# Integration with stealth-seller-frontend

## Overview

The Watchers MVP backend API is designed to work with the existing **stealth-seller-frontend** in the `dev` branch. The frontend UI components are already built and tested.

## Repository Map

```
stealth-seller/
├── repos/
│   ├── stealth-seller-backend/          # Main backend
│   │   └── src/domain/monitoring/       # Original watchers code
│   │
│   ├── stealth-seller-frontend/         # Main frontend (dev branch)
│   │   └── src/v3/features/watchers/    # Complete UI ready to use
│   │
│   └── stealth-seller-watchers-mvp/     # Standalone MVP backend
│       ├── backend/                     # Type-safe tRPC API
│       └── frontend/                    # (Use dev branch instead)
```

## What's Ready

### Frontend (✅ Complete)
Location: `stealth-seller-frontend/src/v3/features/watchers/`

Components:
- `watchers-page.tsx` - Main dashboard (Overview, Manage, Alerts tabs)
- `watch-table.tsx` - Watch management table
- `alert-history.tsx` - Alert feed
- `create-watch-dialog.tsx` - Create watch form
- `use-watches.ts` - Fetch watches
- `use-watch-alerts.ts` - Fetch alerts
- `use-watch-actions.ts` - Archive, snooze, etc.
- `watch-stats.ts` - Dashboard calculations
- Utility components (credit cards, thresholds, etc.)

Features:
- ✅ Overview tab with stats
- ✅ Manage watches with actions (snooze, archive)
- ✅ Alert history feed
- ✅ Create watch dialog
- ✅ Credit display
- ✅ Full Stealth Seller design system
- ✅ Mobile responsive
- ✅ Accessible

### Backend (✅ Complete)
Location: `stealth-seller-watchers-mvp/backend/`

Procedures:
- `listWatches` - Get active watches
- `createWatch` - Create new watch
- `archiveWatch` - Remove watch
- `snoozeWatch` / `unsnoozeWatch` - Pause/resume
- `setWatchCadence` - Change check interval
- `getCredits` - Credit balance
- `listAlerts` - Alert history
- `simulateAlert` - Test alerts

## How to Integrate

### Option 1: Use Watchers MVP Backend with Frontend Dev Branch

**Recommended for MVP/Staging**

1. **Frontend runs from dev branch**
   ```bash
   cd stealth-seller-frontend
   git checkout dev
   npm install --legacy-peer-deps  # (requires GitHub token for @1981-llc-dba-stealth-seller/types)
   npm run dev
   ```

2. **Backend runs from MVP**
   ```bash
   cd stealth-seller-watchers-mvp/backend
   npm run dev
   # Runs on http://localhost:3000
   ```

3. **Frontend config (vite.config.ts)**
   ```typescript
   server: {
     proxy: {
       "/trpc": {
         target: "http://localhost:3000",
         changeOrigin: true,
       },
     },
   }
   ```

4. **Environment (frontend/.env)**
   ```
   VITE_API_URL=http://localhost:3000
   ```

### Option 2: Merge MVP Backend into stealth-seller-backend

**Recommended for Production**

1. Copy monitoring domain from MVP to main backend:
   ```bash
   cp -r stealth-seller-watchers-mvp/backend/src/domain/monitoring \
         stealth-seller-backend/src/domain/
   ```

2. Copy tRPC router:
   ```bash
   # In stealth-seller-backend/src/platform/trpc/router.ts
   # Add: import { monitoringRouter } from "@/domain/monitoring/router"
   # Then: export const appRouter = router({
   #   monitoring: monitoringRouter,
   #   ...
   # })
   ```

3. Replace in-memory database with PostgreSQL:
   - Use Drizzle ORM (already in stealth-seller-backend)
   - Create migrations for watch/alert/target tables
   - Update db queries in tRPC procedures

4. Add real APIs:
   - Firecrawl for URL scraping
   - Keepa API for Amazon data
   - Email via Resend
   - SMS via Twilio

## API Endpoints Reference

### tRPC URL
```
http://localhost:3000/trpc
```

### Watch Operations
```typescript
// List active watches
trpc.listWatches.useQuery()

// Create watch
trpc.createWatch.useMutation()

// Manage watch
trpc.archiveWatch.useMutation()
trpc.snoozeWatch.useMutation()
trpc.unsnoozeWatch.useMutation()
trpc.setWatchCadence.useMutation()
```

### Account & Credits
```typescript
// Get credit balance
trpc.getCredits.useQuery()
```

### Alerts
```typescript
// Get alert history
trpc.listAlerts.useQuery({ limit: 50 })

// Test alert (MVP only)
trpc.simulateAlert.useMutation()
```

## Frontend Configuration

### tRPC Client Setup

In `stealth-seller-frontend/src/trpc.ts`:
```typescript
import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "../../../../../stealth-seller-watchers-mvp/backend/src/trpc";

export const trpc = createTRPCReact<AppRouter>();
```

### Query Client Configuration

In `App.tsx`:
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30000,
    },
  },
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: `${import.meta.env.VITE_API_URL}/trpc`,
      transformer: superjson,
    }),
  ],
});
```

### Available Hooks

Frontend already has these hooks:
- `useWatches()` - Get active watches
- `useWatchAlerts()` - Get alert history
- `useWatchActions()` - Snooze, archive, etc.
- `useWatchersPaused()` - Get/set paused status
- `useWatchCredits()` - Get credit balance

## Testing Integration

### Manual Testing

1. **Start backend**
   ```bash
   cd stealth-seller-watchers-mvp/backend
   npm run dev
   ```

2. **Start frontend (in another terminal)**
   ```bash
   cd stealth-seller-frontend
   npm run dev
   ```

3. **Test features**
   - Visit http://localhost:5173
   - Click "Watchers" in sidebar
   - Create a watch
   - Verify it appears in list
   - Test snooze/archive/simulate alert
   - Check alerts feed

### Verify API Calls

Open browser DevTools → Network tab:
- Look for requests to `/trpc`
- Check response payloads match expected types
- Verify no CORS errors

### Troubleshooting

**"Cannot find module" errors**
- Ensure backend is running
- Check tRPC client points to right backend URL
- Verify CORS headers in response

**Empty watch list**
- Check backend has demo data initialized
- Verify API call in Network tab shows data
- Check browser console for query errors

**Styling issues**
- Frontend uses existing Tailwind config
- Watchers components already styled
- If colors wrong, check Tailwind palette in main frontend

## Next Steps

### For MVP (This Week)
1. ✅ Backend API complete
2. ✅ Frontend UI complete
3. 📋 Test integration end-to-end
4. 📋 Demo to stakeholders
5. 📋 Collect feedback

### For Production (This Sprint)
1. Add PostgreSQL database
2. Implement Firecrawl integration
3. Add Keepa API
4. Email notifications (Resend)
5. Deploy to staging

### For Growth (Next Month)
1. SMS alerts (Twilio)
2. Web push notifications
3. Advanced filters & search
4. User preferences
5. Analytics dashboard

## Project Structure for Dev

```
When developing watchers:

stealth-seller-frontend (dev branch)
├── src/v3/features/watchers/     ← Edit UI here
├── src/v3/hooks/use-watches.ts   ← Edit data hooks
├── src/v3/hooks/use-watch-*.ts   ← Edit other hooks
└── src/pages/admin/watchers-page.tsx ← Route

stealth-seller-watchers-mvp/backend
├── src/db.ts                     ← In-memory data (replace with DB)
├── src/trpc.ts                   ← API endpoints
└── src/server.ts                 ← Express setup
```

## Common Issues

### GitHub Token for @1981-llc-dba-stealth-seller/types

If you get auth errors when installing frontend:

**Solution 1: Use --legacy-peer-deps**
```bash
npm install --legacy-peer-deps
```

**Solution 2: Create GitHub token**
```bash
# Create personal access token at github.com/settings/tokens
# with read:packages permission

# Create ~/.npmrc
echo "@1981-llc-dba-stealth-seller:registry=https://npm.pkg.github.com/" >> ~/.npmrc
echo "//npm.pkg.github.com/:_authToken=YOUR_TOKEN" >> ~/.npmrc

npm install
```

### Port Conflicts

If ports 3000/5173 are in use:
```bash
# Backend
PORT=3001 npm run backend:dev

# Frontend
npm run frontend:dev -- --port 5174
```

Update proxy in vite.config.ts accordingly.

### Type Mismatches

If tRPC types don't match:
1. Stop backend and frontend
2. Clear node_modules: `rm -rf node_modules package-lock.json`
3. Reinstall: `npm install`
4. Restart both servers

## Documentation Links

- Frontend conventions: `stealth-seller-frontend/.claude/skills/frontend-conventions/`
- Backend conventions: `stealth-seller-backend/.claude/skills/backend-conventions/`
- Main README: `stealth-seller-watchers-mvp/README.md`
- Deployment: `stealth-seller-watchers-mvp/DEPLOYMENT.md`
- Testing: `stealth-seller-watchers-mvp/TESTING.md`

## Summary

✅ Backend API: Ready (stealth-seller-watchers-mvp)
✅ Frontend UI: Ready (stealth-seller-frontend dev)
📋 Integration: Follow Option 1 or Option 2 above
🚀 Production: Upgrade database and add real APIs

**Status**: Ready to integrate and test.
