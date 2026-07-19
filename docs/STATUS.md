# Q-Emplois — Live status

_Last verified: 2026-07-19_

This is the **source of truth** for production URLs and launch scope. Prefer this file over older handoffs.

## Production

| Surface | URL | Status |
|---------|-----|--------|
| **Frontend** | https://www.quebec-emplois.ca | Live (Vercel) |
| **API** | https://q-emplois-api-production-f1a6.up.railway.app/api/v1 | Live — `GET /health` → `ok` |
| **API health** | …/api/v1/health | `{"status":"ok","service":"q-emplois-api",…}` |
| **Database** | Supabase Postgres (Prisma) | Connected via Railway `DATABASE_URL` |

**Do not use** (stale / dead):

- `https://q-emplois-production.up.railway.app` — old Railway host
- `https://q-emplois.vercel.app` — share links should use the custom domain
- Any `*.onrender.com` API — ignored by frontend fallback

Frontend fallback API is hard-coded in `frontend/src/services/api.ts` and `frontend/src/utils/siteConfig.ts`.

## Product mode (soft launch)

**Jobs-only beta** — local tasks marketplace (client posts → taskers apply with credits → client selects → optional Stripe task pay or direct pay).

| Feature | State |
|---------|--------|
| Jobs board + applications + credits | **On** |
| In-app messaging (phases 1–4) | **On** |
| Tasker verification + admin | **On** |
| Founding Tasker (first 50 × 60 credits + 20% lifetime) | **On** (backend) |
| Optional Stripe task payment | **On** if Stripe keys set |
| Telegram job alerts | **On** if bot configured |
| L'Atelier escrow | **Off** (`VITE_FEATURE_L_ATELIER` default false) |
| WhatsApp / Twilio | **Deferred** |

**Wedge:** Montréal · Rive-Sud · Pointe-Claire (marketing focus).

## Revenue

- Primary: tasker **credit packs** (1 credit = 1 application; refund if not selected)
- Not taking commission on task payments in beta
- Clients post free in beta

## Repo / deploy

- **Repo:** `brandonlacoste9-tech/q-emplois` · branch `main`
- **Local:** `C:\Users\north\q-emplois` (or workspace clone)
- **Frontend:** `frontend/` → Vercel (auto on push)
- **Backend:** `backend/` → Railway (Dockerfile / nixpacks)
- **Env:** `frontend/.env.production` → `VITE_API_URL` must match live Railway URL

## Recent shipped (Phases A–D)

- **A:** Clickable notifications, homepage CTAs, tasker mobile nav  
- **B:** Verification UX, payment copy, admin suspend  
- **C:** Hide L'Atelier, defer WhatsApp, admin mobile  
- **D:** Security hardening, demo jobs cron docs, credit email  

## Soft-launch checklist

1. [x] Frontend custom domain live  
2. [x] API health OK on current Railway host  
3. [ ] Smoke E2E: register client → post job → register tasker → apply → message → select → optional pay  
4. [ ] Seed 5–10 real client jobs in wedge cities (not only demo cron)  
5. [ ] Recruit founding taskers via `/recrute` share copy  
6. [ ] Stripe webhook points at **current** Railway URL  
7. [ ] CORS / `FRONTEND_URL` include `https://www.quebec-emplois.ca`  
8. [ ] Support inbox monitored (`support@qemplois.ca` or Telegram)

## Docs map

| Doc | Use |
|-----|-----|
| **STATUS.md** (this file) | Live URLs + scope |
| `DEPLOY.md` | Env vars and deploy steps |
| `PAYMENT_POLICY.md` | Credits + optional task pay |
| `RAILWAY_RESTORE.md` | If API dies again |
| `HANDOFF.md` | Historical — **stale URLs**; see STATUS |

## Architecture note

Dual DNA remains in the codebase (Task/jobs marketplace **and** Booking/Service/Escrow for L'Atelier). Soft launch only exposes the jobs path. Do not re-enable L'Atelier until real job reviews and support process are proven.
