# PulseIQ Backend

Website Intelligence API — Express + MongoDB + Lighthouse + Puppeteer

## Setup

```bash
npm install
cp .env.example .env
# Configure MONGODB_URI, JWT_SECRET, Google OAuth credentials
npm run dev
```

## Environment

See `.env.example` for all required variables.

## Scripts

- `npm run dev` — Start dev server with hot reload
- `npm run build` — Compile TypeScript
- `npm start` — Run production server

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Email signup |
| POST | `/api/auth/login` | Email login |
| GET | `/api/auth/google` | Google OAuth |
| GET | `/api/auth/me` | Current user |
| POST | `/api/scan` | Start website scan |
| GET | `/api/scan/:id/stream` | SSE scan progress |
| GET | `/api/reports` | List reports |
| GET | `/api/reports/:id/pdf` | Export PDF |

## Deployment (Render)

### If deploying the `pulseiq-backend` repo directly

| Setting | Value |
|---------|--------|
| **Root Directory** | *(leave empty)* |
| **Build Command** | `npm install --include=dev && npm run build` |
| **Start Command** | `npm start` |

### If deploying from the parent `PulseIQ` monorepo

| Setting | Value |
|---------|--------|
| **Root Directory** | `pulseiq-backend` |
| **Build Command** | `npm install --include=dev && npm run build` |
| **Start Command** | `npm start` |

### Why `dist/index.js` was missing

Render sets `NODE_ENV=production`, which skips `devDependencies` during install. TypeScript was in devDependencies, so `tsc` never ran and `dist/` was never created. TypeScript is now a production dependency, and the build command uses `--include=dev` as a safeguard.

### Environment

Set all variables from `.env.example` in the Render dashboard.

### Puppeteer / Lighthouse on Render

Add these environment variables if Lighthouse fails:

```
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false
```

Consider a Render instance with at least 2 GB RAM for Lighthouse scans.
