# Production smoke E2E results

_Run date: 2026-07-19 · API `q-emplois-api-production-f1a6` · FE `www.quebec-emplois.ca`_

## Verdict

**Core loop is live and healthy for soft launch**, with one intentional gate before apply:

| Stage | Result | Notes |
|-------|--------|--------|
| API health | **PASS** | `status: ok` |
| Price guides (public) | **PASS** | Returns CAD ranges |
| Stripe config | **PASS** | `configured: true` (**live** keys) |
| Register client | **PASS** | JWT issued |
| Register tasker + provider | **PASS** | role `provider` |
| Founding Tasker bonus | **PASS** | balance **60**, `isFoundingTasker: true`, number **#7** |
| Client post job | **PASS** | 201 + job id |
| Tasker list jobs | **PASS** | New job visible |
| Pre-apply inquiry messaging | **PASS** | conversation `inquiry` created |
| Tasker apply | **BLOCKED (by design)** | Needs ID upload **and** admin approve |
| Select / start / complete | **Not reached** | Depends on apply |
| Cancel job (client) | **PASS** | Cleanup works |
| Login + `/auth/me` | **PASS** | |

### UI deploy check (browser)

| Check | Result |
|-------|--------|
| Homepage beta strip | Live |
| Dual path client/tasker cards | Live |
| Founding copy on landing | Live |
| Price guides on category cards | Live (API-backed) |

## Blockers discovered

### 1. Apply requires verification (expected)

`jobs.service.ts` → `assertCanApplyAsTasker`:

1. Provider profile exists  
2. `licenseDocumentUrl` set (ID upload)  
3. `isVerified === true` (admin approve)  
4. Verification not expired  

**Ops impact:** founding taskers cannot spend free credits until you **manually verify** them in `/admin`. Plan support time for this — it is the main day-1 bottleneck.

### 2. Canadian phone validation is strict

`RegisterDto` uses `@IsPhoneNumber('CA')`. Synthetic numbers (`+1514xxxxxxx`) return:

> Veuillez fournir un numéro de téléphone valide au Canada.

**UX impact:** real users with bad formatting may fail; empty phone works. Prefer client-side formatting (`normalizeCanadianPhone`) and clear FR errors.

### 3. Stripe is live mode

`/payments/config` returns a **live** publishable key. Do **not** run real credit purchases during smoke. Use Stripe test mode only if you temporarily swap keys.

## Happy path (manual, with admin)

1. Client: register → `/book` or post job → wait for applicants  
2. Tasker: register with services → get 60 founding credits → Profile → upload ID  
3. **You (admin):** `/admin` → approve verification  
4. Tasker: browse jobs → optional inquiry → apply (1 credit)  
5. Client: select tasker → message → start → complete → optional Stripe pay or direct  
6. Both: review  

## Automated re-run (PowerShell sketch)

```powershell
$Base = 'https://q-emplois-api-production-f1a6.up.railway.app/api/v1'
# 1) POST /auth/register client (no phone required)
# 2) POST /auth/register tasker with serviceTypes, no fake phone
# 3) GET /credits/balance  → expect 60 if founding slots remain
# 4) POST /jobs as client
# 5) POST /jobs/:id/inquiry as tasker
# 6) Apply only after admin verify
```

## Smoke accounts created (2026-07-19)

Disposable `@qemplois-test.local` users — safe to suspend/delete later:

- Client / tasker pairs with emails `smoke.client.<unix>@…` and `smoke.tasker.<unix>@…`
- Jobs titled `[SMOKE] …` were cancelled when incomplete

## Soft-launch greenlight

| Area | Status |
|------|--------|
| Infra | Green |
| Client post | Green |
| Tasker signup + founding credits | Green |
| Messaging inquiry | Green |
| Apply → select → pay | Yellow — needs admin verify process |
| Paid ads | Red until 10+ real completed jobs |

See also: [FOUNDING_OPS_2WEEK.md](./FOUNDING_OPS_2WEEK.md) · [STATUS.md](./STATUS.md)
