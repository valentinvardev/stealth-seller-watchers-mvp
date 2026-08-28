# Deployment Guide

## Overview

This MVP can be deployed in multiple ways:
1. **Local Development** - Run on your machine for testing
2. **Docker** - Containerized deployment
3. **GitHub Pages + Vercel** - Frontend on Pages, Backend on Vercel Functions
4. **AWS/Heroku** - Full stack deployment

## Local Deployment

### Prerequisites
- Node.js >= 18
- npm or yarn

### Setup

```bash
# Clone and navigate to the repo
git clone <repo-url>
cd stealth-seller-watchers-mvp

# Install dependencies
npm install
cd frontend && npm install && cd ..
cd backend && npm install && cd ..

# Start development servers
npm run dev
```

The app will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- tRPC endpoint: http://localhost:3000/trpc

## Production Build

### Build all components

```bash
npm run build
```

This generates:
- Backend: Compiled TypeScript in `backend/dist/`
- Frontend: Optimized bundle in `frontend/dist/`

### Start production server

```bash
# Backend
cd backend
npm start

# Frontend (in another terminal)
cd frontend
npx serve -s dist -l 3001
```

## Docker Deployment

### Build Docker image

Create `Dockerfile` in the root:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install dependencies
RUN npm install
RUN cd backend && npm install && cd ..
RUN cd frontend && npm install && cd ..

# Build
RUN npm run build

# Expose ports
EXPOSE 3000 5173

# Start both servers
CMD ["sh", "-c", "cd backend && npm start & cd frontend && npx serve -s dist -l 5173"]
```

### Build and run

```bash
docker build -t stealth-seller-watchers:latest .
docker run -p 3000:3000 -p 5173:5173 stealth-seller-watchers:latest
```

## Heroku Deployment

### Create Procfile

```
web: npm start
```

### Deploy

```bash
heroku create stealth-seller-watchers
heroku buildpacks:add heroku/nodejs
git push heroku main
```

## Vercel Deployment (Frontend)

### Deploy frontend to Vercel

```bash
cd frontend
npm install -g vercel
vercel
```

Configure the build settings:
- Build Command: `npm run build`
- Output Directory: `dist`

### Configure backend proxy

In `vercel.json`:

```json
{
  "rewrites": [
    {
      "source": "/trpc/:path*",
      "destination": "https://your-backend-url/trpc/:path*"
    }
  ]
}
```

## Environment Variables

Create `.env.local` files for environment-specific config:

**Backend** (`backend/.env`):
```
PORT=3000
NODE_ENV=production
```

**Frontend** (`frontend/.env`):
```
VITE_API_URL=http://localhost:3000
```

## Testing Before Deployment

### Run all tests

```bash
# Backend tests (if added)
cd backend && npm test

# Frontend tests (if added)
cd frontend && npm test
```

### Manual testing checklist

- [ ] Backend health check: `curl http://localhost:3000/health`
- [ ] Frontend loads: `http://localhost:5173`
- [ ] Can create a watch
- [ ] Can see watch in list
- [ ] Can simulate alert
- [ ] Can archive watch
- [ ] Can snooze/resume watch
- [ ] Credits display correctly
- [ ] Alert history shows
- [ ] Responsive on mobile (DevTools)

## Monitoring & Logs

### Backend logs
```bash
# Development
npm run backend:dev

# Production (capture logs)
cd backend && npm start 2>&1 | tee backend.log
```

### Frontend logs
Check browser DevTools Console (F12)

### Database backups
For production with real database, set up automated backups:
- If using PostgreSQL: Use `pg_dump` with cron
- If using AWS RDS: Enable automated backups
- If using Docker: Mount volumes for persistence

## Scaling Considerations

### Backend
- Add Redis caching for watch queries
- Implement connection pooling (PgBouncer)
- Scale to multiple instances behind load balancer
- Use message queue (BullMQ) for polling job distribution

### Frontend
- Enable gzip compression
- Use CDN (CloudFront, Cloudflare)
- Implement service workers for offline support
- Add progressive image loading

### Database
- Add read replicas for scaling queries
- Implement sharding by user ID for horizontal scaling
- Regular VACUUM and index maintenance

## CI/CD Pipeline

### GitHub Actions workflow (.github/workflows/deploy.yml)

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
      
      - name: Build
        run: npm run build
      
      - name: Deploy to Vercel (Frontend)
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
        run: vercel --prod
      
      - name: Deploy to Heroku (Backend)
        env:
          HEROKU_API_KEY: ${{ secrets.HEROKU_API_KEY }}
        run: |
          git push https://heroku:$HEROKU_API_KEY@git.heroku.com/stealth-seller-watchers.git main
```

## Troubleshooting

### Backend won't start
```bash
# Check if port 3000 is in use
lsof -i :3000
# Kill the process
kill -9 <PID>
```

### Frontend can't reach backend
- Verify backend is running on port 3000
- Check CORS configuration
- Verify proxy settings in vite.config.ts
- Check browser DevTools Network tab

### Build failures
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

### Database connection errors
- Verify database URL in .env
- Check credentials and permissions
- Test connection: `psql <DATABASE_URL>`

## Security Checklist

Before production:
- [ ] Remove demo data from backend
- [ ] Set secure environment variables
- [ ] Enable HTTPS/TLS
- [ ] Implement rate limiting
- [ ] Add authentication (Better Auth)
- [ ] Enable CORS restrictions
- [ ] Use secrets management (AWS Secrets Manager, HashiCorp Vault)
- [ ] Regular security audits
- [ ] Implement logging and monitoring
- [ ] Set up alerts for errors
- [ ] Regular dependency updates

## Performance Optimization

### Frontend
- Enable code splitting with Vite
- Lazy load components with React.lazy()
- Implement virtual scrolling for large lists
- Use memoization for expensive components

### Backend
- Add query caching
- Implement pagination
- Use connection pooling
- Add request rate limiting

## Support

For issues or questions:
1. Check logs: `npm run dev` with verbose output
2. Check browser console (Frontend)
3. Review error messages in server logs
4. Test individual components in isolation
