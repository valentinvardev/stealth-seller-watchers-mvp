# Stealth Seller Watchers MVP

A standalone MVP of the Watchers feature for Stealth Seller. Monitor Amazon products and custom URLs for price changes, stock updates, and more.

## Features

- **Create Watches**: Monitor products by ASIN or custom URL
- **Conditions**: Price drops, price changes, back in stock
- **Smart Scheduling**: Configurable check intervals (2h, 3h, 6h, 24h)
- **Alert History**: Track all triggered alerts
- **Credit System**: Monthly credit grants + purchased credits
- **Watch Management**: Snooze, archive, and manage active watches
- **Responsive Design**: Mobile-friendly interface using Tailwind CSS
- **Stealth Seller Branding**: Orange (#FC5815) accent with dark slate neutrals

## Architecture

### Backend
- **Framework**: Express + tRPC
- **Database**: In-memory (for MVP)
- **API**: Type-safe tRPC procedures
- **Runtime**: Node.js with TypeScript

### Frontend
- **Location**: `stealth-seller-frontend` (dev branch)
- **Framework**: React 18 + Vite
- **Styling**: Tailwind CSS + Radix UI primitives + Stealth Seller design system
- **Client**: tRPC + TanStack Query
- **TypeScript**: Strict mode for type safety
- **Note**: This repo provides backend API only. Use frontend from stealth-seller-frontend/dev

## Quick Start

### Prerequisites
- Node.js >= 18
- npm or pnpm
- GitHub token (for stealth-seller-frontend private packages)

### Step 1: Backend Setup (This Repo)

```bash
cd stealth-seller-watchers-mvp/backend
npm install
npm run dev
# Runs on http://localhost:3000
```

### Step 2: Frontend Setup (Use Dev Branch)

```bash
# Setup GitHub token first (see GITHUB_TOKEN_SETUP.md)
cd stealth-seller-frontend
git checkout dev
npm install --legacy-peer-deps
npm run dev
# Runs on http://localhost:5173
```

### Step 3: Visit the App

Open http://localhost:5173 in your browser

**Expected:**
- Beautiful Watchers dashboard matching the Stealth Seller design
- Ability to create watches
- Alert history
- Watch management

---

## Architecture

**Backend** (This Repo)
- Express + tRPC API
- Firecrawl integration for URL scraping
- Type-safe procedures
- Runs on `http://localhost:3000`

**Frontend** (stealth-seller-frontend/dev)
- React + Vite application
- Stealth Seller design system
- Communicates with backend via tRPC
- Runs on `http://localhost:5173`

**Communication**
- Frontend proxies `/trpc` requests to backend
- Type-safe tRPC ensures consistency
- Environment variable `VITE_API_URL` controls backend URL

The frontend will proxy tRPC calls to the backend.

### Build

```bash
pnpm build
```

## Project Structure

```
stealth-seller-watchers-mvp/
├── backend/
│   ├── src/
│   │   ├── db.ts           # In-memory database
│   │   ├── trpc.ts         # tRPC router and procedures
│   │   └── server.ts       # Express server
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/     # React components
│   │   │   ├── ui/         # Radix UI + Tailwind components
│   │   │   ├── create-watch-dialog.tsx
│   │   │   └── alert-history.tsx
│   │   ├── pages/
│   │   │   └── watchers.tsx   # Main page
│   │   ├── lib/
│   │   │   └── utils.ts       # Utility functions
│   │   ├── trpc.ts            # tRPC client
│   │   ├── App.tsx            # App root
│   │   ├── main.tsx           # Entry point
│   │   └── globals.css        # Global styles
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── tsconfig.json
├── package.json            # Root workspace config
└── README.md
```

## API Routes

### Watches
- `listWatches` - Get active watches
- `createWatch` - Create a new watch
- `archiveWatch` - Archive a watch
- `snoozeWatch` - Snooze a watch
- `unsnoozeWatch` - Resume a snoozed watch
- `setWatchCadence` - Change polling interval

### Credits
- `getCredits` - Get current credit balance

### Alerts
- `listAlerts` - Get alert history
- `simulateAlert` - Simulate an alert (demo only)

## Design System

- **Primary Color**: #FC5815 (Stealth Seller Orange)
- **Neutrals**: Dark slate (50-950)
- **Typography**: Inter font family
- **Components**: Radix UI primitives + custom Tailwind styling
- **Responsive**: Mobile-first with Tailwind breakpoints

## Demo Data

The backend initializes with demo user and watch data:
- Demo user ID with premium tier
- Sample watch on Sony headphones
- Sample alert in history

## Future Enhancements

- Real database (PostgreSQL + Drizzle ORM)
- Firecrawl integration for URL scraping
- Keepa API integration for ASIN data
- Email/SMS alert delivery
- Real-time polling worker
- User authentication
- Multi-user support
- Credit purchase flow
- Webhook integrations

## Development Notes

### Type Safety
- Backend and frontend share tRPC type definitions
- All API inputs validated with Zod
- Strict TypeScript mode enabled

### Styling
- Tailwind CSS for all styling
- Custom color palette matching Stealth Seller branding
- Dark mode support via CSS variables
- Responsive design with mobile-first approach

### State Management
- TanStack Query for server state
- React hooks for local state
- tRPC mutations for server actions

## Deployment

### Backend
```bash
cd backend
npm run build
npm start
```

### Frontend
```bash
cd frontend
npm run build
# Serve dist/ directory
```

## Troubleshooting

**Frontend can't connect to backend?**
- Ensure backend is running on port 3000
- Check Vite proxy config in `frontend/vite.config.ts`
- Verify CORS is enabled in backend

**Port 3000 or 5173 already in use?**
- Change `PORT` env var for backend
- Change `--port` flag for frontend

**TypeScript errors in frontend?**
- Run `pnpm install` in backend to generate type definitions
- Ensure `tsconfig.json` path mappings are correct

## License

Proprietary - Stealth Seller
