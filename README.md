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

Use `render.yaml` or create a Web Service with:

- Build: `npm install && npm run build`
- Start: `npm start`
- Add Chrome/Chromium for Lighthouse (Puppeteer bundles Chromium)

## Notes

- Lighthouse requires Chrome/Chromium available on the server
- MongoDB Atlas connection string required for production
