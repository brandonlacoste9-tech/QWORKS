# Founding Tasker program — 2-week ops checklist

**Goal:** First **50** taskers active in **Montréal / Rive-Sud / Pointe-Claire**, enough real jobs that credits get used, and a support rhythm you can sustain.

**Product truth (from prod smoke):** Taskers get **60 free credits** on signup (if under 50 founding), but they **cannot apply** until ID is uploaded **and you approve** in admin. Plan for that.

**Live URLs**

| | |
|--|--|
| Site | https://www.quebec-emplois.ca |
| Recruit taskers | https://www.quebec-emplois.ca/recrute |
| Help clients | https://www.quebec-emplois.ca/aide |
| Admin | https://www.quebec-emplois.ca/admin |
| Support | support@qemplois.ca (or your Telegram) |

---

## Week 0 — Day before public push (2–4 hours)

- [ ] Confirm API health: `…/api/v1/health` → ok  
- [ ] Confirm Stripe webhook points at current Railway host  
- [ ] Railway `FRONTEND_URL` + `CORS_ORIGIN` include `https://www.quebec-emplois.ca`  
- [ ] You can log in as **admin** on production  
- [ ] Admin verification queue works (approve/reject)  
- [ ] Support channel checked daily (email + optional Telegram)  
- [ ] Prepare 5–10 **real** client jobs (friends/family/neighbors) — not only demo cron  
- [ ] Print or bookmark share copy from `/recrute` and `/aide`  
- [ ] Know your wedge categories: **déménagement, ménage, montage meubles** first  

---

## Week 1 — Supply + first matches

### Daily (15–30 min)

- [ ] Open `/admin` → clear **pending verifications** (same day if possible)  
- [ ] Reply to support / messages within 12 hours  
- [ ] Check jobs board: open jobs without applicants → ping founding taskers  
- [ ] Cancel or complete stuck `[SMOKE]` / test jobs  

### Day 1–2 — Recruit taskers (target +15)

Post in:

- [ ] Facebook groups (quartier MTL / Rive-Sud / West Island)  
- [ ] Student / side-hustle groups  
- [ ] Personal network (WhatsApp / Telegram)  
- [ ] Kijiji “services offered” or “seeking work”  

Use ready copy on **https://www.quebec-emplois.ca/recrute** (copy buttons).

Message after signup:

> Merci! Téléverse ta pièce d’identité dans Profil — je valide en général le jour même. Ensuite tu peux postuler avec tes crédits Founding.

### Day 2–4 — Seed demand (target +10 real jobs)

- [ ] You or friends post real tasks via `/book` or client account  
- [ ] Offer to “matchmake” manually: text a founding tasker the job link  
- [ ] Prefer jobs **≤ $150** and simple so first reviews are easy  

### Day 5–7 — Close loops

- [ ] Aim for **5 completed jobs** with reviews  
- [ ] Screenshot 2–3 happy paths (blur PII) for social proof  
- [ ] Note friction in a running list (signup, verify lag, apply errors)  

**Week 1 success criteria**

| Metric | Target |
|--------|--------|
| Founding taskers verified | ≥ 15 |
| Open real jobs | ≥ 8 |
| Completed jobs | ≥ 5 |
| Avg verify turnaround | &lt; 24 h |

---

## Week 2 — Density + retention

### Daily

- [ ] Same admin + support ritual  
- [ ] Post **one** client-side share (`/aide`) and **one** tasker share (`/recrute`)  

### Focus

- [ ] Re-engage taskers with credits unused: “3 jobs open near you this week”  
- [ ] Ask every completed job for a short testimonial (1 sentence FR)  
- [ ] Fill category holes: if only ménage applies, seed more déménagement/montage  
- [ ] Optional: invite codes for trusted taskers only (admin invites)  

### End of week 2 review

- [ ] Founding slots used: ___ / 50  
- [ ] Credits spent (applications): ___  
- [ ] Completed jobs: ___  
- [ ] Disputes / support tickets: ___  
- [ ] Decision: extend beta / narrow wedge / open light paid acquisition  

**Week 2 success criteria**

| Metric | Target |
|--------|--------|
| Founding taskers verified | ≥ 30 |
| Completed jobs (cumulative) | ≥ 15 |
| Taskers with ≥1 apply | ≥ 20 |
| Repeat client or 2nd job | ≥ 3 |

---

## Verification SLA (critical path)

```
Tasker uploads ID → you get notified (or check admin 2×/day)
  → Approve if photo readable
  → Reject with reason if blurry / wrong doc
  → Message tasker either way
```

Without this SLA, free credits sit unused and taskers churn.

---

## Do / Don't

| Do | Don't |
|----|--------|
| Stay in MTL / Rive-Sud wedge | Promise all of Québec day 1 |
| Manually seed first jobs | Rely only on demo job cron |
| Verify IDs the same day | Leave queue for a week |
| Keep payment copy honest (optional Stripe) | Claim full escrow |
| Pause paid ads if board is empty | Spend on ads before 15 completed jobs |
| Keep L'Atelier off | Turn on escrow mid-beta |

---

## Support scripts (FR)

**Tasker just signed up**

> Bienvenue Founding Tasker 🏆 — tu as 60 crédits. Étape suivante : Profil → pièce d’identité. Dès que c’est approuvé, tu postules sur les jobs près de chez toi.

**Client posted, no applicants**

> Merci d’avoir publié. Je contacte nos travailleurs vérifiés du secteur. Tu peux aussi partager le lien /aide dans ton groupe de quartier.

**Dispute / bad experience**

> Désolé pour le désagrément. On est en bêta — dis-moi ce qui s’est passé (job # si possible). On regarde la messagerie et on t’aide à débloquer (replanifier / annuler / revoir).

---

## Metrics board (simple sheet)

Columns: date | new taskers | verified | new jobs | applies | completed | support tickets | notes  

Update daily; 5 minutes is enough.

---

## After 2 weeks

1. If **completed ≥ 15** and support is manageable → soft public push (more groups, SEO keep)  
2. If **taskers >> jobs** → stop recruiting 1 week; only seed clients  
3. If **jobs >> taskers** → open remaining founding slots hard; speed verify  
4. Only then consider: paid ads, L'Atelier flag, commission experiments  

Related: [SMOKE_E2E.md](./SMOKE_E2E.md) · [STATUS.md](./STATUS.md) · [PAYMENT_POLICY.md](./PAYMENT_POLICY.md)
