# Quick Start Guide

## 5-Minute Setup

### 1. Clone the repo
```bash
git clone https://github.com/1981-LLC-dba-Stealth-Seller/stealth-seller-watchers-mvp.git
cd stealth-seller-watchers-mvp
```

### 2. Install dependencies
```bash
# Install root dependencies
npm install

# Install backend
cd backend && npm install && cd ..

# Install frontend
cd frontend && npm install && cd ..
```

### 3. Start the dev servers
```bash
# From repo root, start both in parallel
npm run dev
```

You'll see:
```
> stealth-seller-watchers-mvp@0.1.0 dev
> concurrently "npm run backend:dev" "npm run frontend:dev"

[0] Watchers backend running on http://localhost:3000
[1] > @stealth-seller/watchers-frontend@0.1.0 dev
[1] VITE v5.4.21  ready in 500 ms
[1] ➜  Local:   http://localhost:5173/
```

### 4. Open the app
Visit **http://localhost:5173** in your browser

## What You'll See

### Demo Data Loaded
- 1 active watch on Sony headphones
- 1 alert showing a price drop
- 150 watch credits (100 grant + 50 purchased)

### Three Main Sections

**Overview Tab**
- Active watches count
- Credits and refill schedule
- List of currently watching products

**Manage Watches Tab**
- All active watches
- Snooze/resume, archive, simulate alerts
- View check intervals and expiration dates

**Alerts Tab**
- Alert history with timestamps
- Product info from each alert
- Delivery status (sent/pending/failed)

## Available Actions

### Create a Watch
Click "New Watch" to monitor:
- **Amazon ASIN**: Product by Amazon code (e.g., B0BL1SHXRX)
- **Custom URL**: Any product webpage

### Set Conditions
- **Price drops**: Alert when price falls below target or any drop
- **Back in stock**: Alert when item becomes available
- **Price changes**: Alert on any price movement (URL only)

### Configure Checks
- **Intervals**: Every 2h, 3h, 6h, or 24h
- **Duration**: 1 week, 1 month, or 3 months
- **Credits**: Each check costs 1 credit (displayed when creating)

### Manage Active Watches
- **Snooze**: Pause for up to 90 days (stays active, no alerts)
- **Resume**: Turn snoozed watch back on
- **Simulate Alert**: Create a test alert to verify notifications
- **Archive**: Remove a watch permanently

## Project Structure

```
stealth-seller-watchers-mvp/
├── backend/                    # Express + tRPC server
│   ├── src/
│   │   ├── db.ts              # In-memory database
│   │   ├── trpc.ts            # tRPC API procedures
│   │   ├── server.ts          # Express setup
│   │   └── domain/
│   │       └── monitoring/    # Watch schemas
│   ├── package.json
│   └── tsconfig.json
├── frontend/                   # React + Vite app
│   ├── src/
│   │   ├── pages/
│   │   │   └── watchers.tsx   # Main page
│   │   ├── components/        # React components
│   │   ├── lib/
│   │   ├── App.tsx            # App root
│   │   ├── main.tsx           # Entry point
│   │   └── trpc.ts            # tRPC client
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── package.json
│   └── tsconfig.json
├── package.json               # Root workspace
├── README.md                  # Feature documentation
├── DEPLOYMENT.md              # How to deploy
├── TESTING.md                 # Testing guide
└── SETUP.md                   # This file
```

## Technology Stack

### Backend
- **Framework**: Express.js + tRPC
- **Runtime**: Node.js + TypeScript
- **Database**: In-memory (MVP)
- **Type Safety**: Zod schemas

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **API Client**: tRPC + TanStack Query
- **UI Components**: Radix UI primitives
- **Icons**: Lucide React

### Design System
- **Primary Color**: #FC5815 (Stealth Seller Orange)
- **Neutrals**: Slate 50-950 color scale
- **Typography**: Inter font
- **Responsive**: Mobile-first with Tailwind breakpoints

## Common Commands

```bash
# Development
npm run dev                # Start both servers
npm run backend:dev       # Backend only
npm run frontend:dev      # Frontend only

# Build
npm run build            # Build both
npm run backend:build    # Backend only
npm run frontend:build   # Frontend only

# Production
cd backend && npm start   # Start backend
cd frontend && npx serve -s dist # Serve frontend
```

## API Endpoints

### tRPC Router: http://localhost:3000/trpc

**Watch Operations**
- `listWatches` - Get all active watches
- `createWatch` - Create new watch
- `archiveWatch` - Remove a watch
- `snoozeWatch` - Pause temporarily
- `unsnoozeWatch` - Resume from pause
- `setWatchCadence` - Change check interval

**Credits & Account**
- `getCredits` - Current balance
- `getWatcherStatus` - Paused status

**Alerts**
- `listAlerts` - Alert history
- `simulateAlert` - Test alert (demo)

## Environment Variables

**Backend** (optional for MVP):
```
PORT=3000
NODE_ENV=development
```

**Frontend** (optional for MVP):
```
VITE_API_URL=http://localhost:3000
```

## Troubleshooting

### Port already in use
```bash
# Find what's using port 3000
lsof -i :3000
# Kill it
kill -9 <PID>

# Or change port
PORT=3001 npm run backend:dev
```

### Frontend can't reach backend
```bash
# Verify backend is running
curl http://localhost:3000/health
# Should return: {"status":"ok"}

# Check browser Network tab (F12) for failed requests
```

### Build fails
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
npm run build
```

### TypeScript errors
```bash
# Update types
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

## Next Steps

### To Integrate with Real Data:
1. Replace in-memory database with PostgreSQL + Drizzle ORM
2. Add Firecrawl integration for URL scraping
3. Add Keepa API for Amazon ASIN data
4. Implement real polling worker

### To Add Authentication:
1. Implement Better Auth
2. Add login/signup pages
3. Protect API routes with middleware
4. Multi-user support

### To Enable Notifications:
1. Integrate Resend for email
2. Add SMS via Twilio
3. Web push notifications
4. Alert delivery tracking

### To Deploy:
1. See **DEPLOYMENT.md** for step-by-step instructions
2. Choose your platform (Heroku, Vercel, AWS, Docker)
3. Set up CI/CD with GitHub Actions
4. Monitor with logging and alerts

## Testing

For comprehensive testing guide, see **TESTING.md**

Quick manual tests:
1. ✅ Create a watch
2. ✅ View it in the list
3. ✅ Simulate an alert
4. ✅ Snooze and resume
5. ✅ Archive a watch
6. ✅ Check credits display

## Support

For issues or questions:
1. Check logs in terminal
2. Open browser DevTools (F12)
3. Check Network tab for API errors
4. Review error messages in console

## License

Proprietary - Stealth Seller

---

**Ready to go?** Start with: `npm run dev` then visit http://localhost:5173 🚀
