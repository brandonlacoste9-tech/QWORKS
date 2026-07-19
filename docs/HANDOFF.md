# Q-Emplois — Handoff

_Last updated: 2026-07-19_

> **Live URLs and checklist:** see **[STATUS.md](./STATUS.md)** first. This file is a short orientation; STATUS is authoritative for production.

## Overview

**Q-Emplois** (Québec Emplois) is a Québec-first local jobs marketplace: clients post small jobs; taskers apply with credits; clients choose; payment is optional Stripe or direct.

- **Repo:** `brandonlacoste9-tech/q-emplois` · `main`  
- **Stack:** React 19 + Vite + RR7 (frontend); NestJS + Prisma + Postgres (backend)  
- **Design:** Cuir Québécois — navy / gold / cream (`DESIGN.md`)  
- **FR-first** with EN toggle  

## Production (do not use stale hosts)

| | URL |
|--|-----|
| Site | https://www.quebec-emplois.ca |
| API | https://q-emplois-api-production-f1a6.up.railway.app/api/v1 |

## Soft-launch scope

- **In:** jobs, credits, messaging, verification, admin, founding taskers, optional Stripe  
- **Out:** L'Atelier escrow UI (flag off), WhatsApp  

## Key paths

| Path | Role |
|------|------|
| `/` | Landing (beta strip, dual path CTAs) |
| `/book`, `/aide` | Client post / help funnel |
| `/recrute` | Tasker recruitment + share copy |
| `/register`, `/register/client`, `/register/tasker` | Signup |
| `/jobs`, `/jobs/:id`, `/messages`, `/credits` | Authenticated product |
| `/admin` | Admin |

## Config

- Public domain helper: `frontend/src/utils/siteConfig.ts`  
- API client: `frontend/src/services/api.ts`  
- Feature flag L'Atelier: `frontend/src/utils/featureFlags.ts`  
- Payments: `docs/PAYMENT_POLICY.md`  
- Deploy: `docs/DEPLOY.md`  

## What's next (ops, not code)

1. Smoke E2E on production  
2. Seed real jobs in MTL / Rive-Sud  
3. Recruit founding 50 via `/recrute`  
4. Confirm Stripe webhook + CORS for custom domain  
5. Keep L'Atelier off until job loop is proven  

## Historical note

Older handoff (June 2026) claimed missing PostJob UI and dead Railway — **superseded**. Phases A–D are on `main` (through `3b83e15` and later soft-launch polish).
