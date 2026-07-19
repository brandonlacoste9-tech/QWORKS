# Production deploy checklist

## Live production (verify first)

See **[STATUS.md](./STATUS.md)**. As of 2026-07:

- Frontend: `https://www.quebec-emplois.ca`
- API: `https://q-emplois-api-production-f1a6.up.railway.app/api/v1`

## Railway (backend)

1. Open the **active** Railway service → **Variables**:
   - `DATABASE_URL` — Supabase **session pooler** (`aws-1-us-east-1.pooler.supabase.com:5432`)
   - `JWT_SECRET` — min 32 chars
   - `CORS_ORIGIN` — `https://www.quebec-emplois.ca` (and preview URLs if needed)
   - `FRONTEND_URL` — `https://www.quebec-emplois.ca`
   - `RESEND_API_KEY` — transactional email (password reset, application alerts)
   - `EMAIL_FROM` — e.g. `Q-Emplois <noreply@qemplois.ca>`
   - `MIGRATE_DATABASE_URL` — Supabase **session pooler** `:5432` (for auto-migrate on deploy)
   - `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` — ID document storage (optional; falls back to inline)
   - Remove `REDIS_URL` if it points to localhost (in-memory fallback is fine)
   - Optional: `STRIPE_*` for payments
   - **Admin verification alerts (soft-launch critical):**
     - `ADMIN_EMAIL` — your inbox (Resend must allow this recipient/domain)
     - `VERIFICATION_DIGEST_ENABLED=true` — morning digest 08:00 America/Toronto of all pending IDs
     - Optional `TELEGRAM_ADMIN_CHAT_ID` — instant + digest pings via bot
   - Demo job rotation (recommended on production):
     - `DEMO_JOBS_CRON_ENABLED=true` — daily cron at 5 AM ET
     - `DEMO_JOBS_ROTATION_DAYS=3` — rotate demo set every N days
     - `DEMO_JOBS_MIN_OPEN=6` — re-seed if fewer open demo jobs

2. **Settings → Domains** — copy the current `*.up.railway.app` URL (old `q-emplois-production` may 404 if the service was recreated).

3. After deploy, verify:
   - `GET https://YOUR-RAILWAY-URL.up.railway.app/api/v1/health` → `{ "status": "ok" }`
   - Logs show `Connected to PostgreSQL`

4. Run migrations once (local or CI):
   ```bash
   cd backend && npx prisma migrate deploy
   npm run seed   # optional demo data
   ```

## Vercel (frontend)

Set `VITE_API_URL=https://YOUR-RAILWAY-URL.up.railway.app/api/v1` in Vercel env (or update `frontend/.env.production` and redeploy).

Current production value:

```
VITE_API_URL=https://q-emplois-api-production-f1a6.up.railway.app/api/v1
```

Also keep hard-coded fallbacks in `frontend/src/services/api.ts` and `frontend/src/utils/siteConfig.ts` in sync if the Railway host changes.

Domain: attach **www.quebec-emplois.ca** (and apex redirect if desired).

## Stripe webhook

Point Stripe to: `https://YOUR-RAILWAY-URL.up.railway.app/api/v1/payments/webhook`

## Tasker alerts (Telegram — live)

Taskers connect Telegram from **Profile**. Job alerts use the Telegram bot (`TELEGRAM_BOT_USERNAME` on Railway).

## WhatsApp (deferred)

Twilio WhatsApp is **not** part of the current beta. Do not configure `TWILIO_*` unless building Phase 3 messaging. User-facing copy is Telegram-only.

## Beta smoke test

1. Register client → post task
2. Register tasker → claim with credits → start → complete → review
3. Buy credits (Stripe test mode)
4. Send in-app message after claim
5. (Optional) L'Atelier escrow — requires `VITE_FEATURE_L_ATELIER=true` on Vercel
