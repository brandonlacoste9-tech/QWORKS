# Restore Railway backend (Q-Emplois)

## Current production (2026-07)

| Item | Value |
|------|--------|
| Frontend | **https://www.quebec-emplois.ca** |
| API | **https://q-emplois-api-production-f1a6.up.railway.app/api/v1** |
| Health | `GET …/api/v1/health` → `{"status":"ok","service":"q-emplois-api",…}` |

If health fails or returns 404, recreate/redeploy the Railway service using the steps below, then update:

1. Railway domain → new URL  
2. `frontend/.env.production` → `VITE_API_URL`  
3. Hard-coded fallbacks in `frontend/src/services/api.ts` and `frontend/src/utils/siteConfig.ts`  
4. Vercel env `VITE_API_URL` + redeploy  
5. Stripe webhook endpoint  
6. Railway `CORS_ORIGIN` / `FRONTEND_URL` → `https://www.quebec-emplois.ca`

---

## Step 1 — Railway dashboard

1. Go to [railway.app](https://railway.app) → project for Q-Emplois  
2. Redeploy from GitHub `brandonlacoste9-tech/q-emplois` (root Dockerfile / `backend/`)  
3. Or **New Project** → Deploy from GitHub if the service was deleted

## Step 2 — Environment variables

| Variable | Value |
|----------|--------|
| `DATABASE_URL` | Supabase session pooler URI (port **5432**) |
| `JWT_SECRET` | Random string, ≥ 32 characters |
| `CORS_ORIGIN` | `https://www.quebec-emplois.ca` |
| `FRONTEND_URL` | `https://www.quebec-emplois.ca` |
| `PORT` | `3000` (usually auto-set) |
| Optional | `STRIPE_*`, `RESEND_API_KEY`, `EMAIL_FROM`, Telegram bot vars, demo job cron vars |

**Do not set `REDIS_URL`** to localhost — app uses in-memory fallback if unset.

## Step 3 — Domain

**Settings → Networking → Generate domain** → e.g. `https://q-emplois-api-production-XXXX.up.railway.app`

## Step 4 — Verify

```
GET https://YOUR-URL.up.railway.app/api/v1/health
```

Expected: `{"status":"ok","service":"q-emplois-api",...}`

Logs should show: `Connected to PostgreSQL`

## Step 5 — Point frontend + Stripe

- Vercel: `VITE_API_URL=https://YOUR-URL.up.railway.app/api/v1`  
- Stripe webhook: `https://YOUR-URL.up.railway.app/api/v1/payments/webhook`  
- See also `docs/STATUS.md` and `docs/DEPLOY.md`
