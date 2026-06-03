# My Govt Jobs — Product roadmap

Full delivery plan from foundation → live data → trust → alerts → monetization → scale.

**GitHub issues:** Run `scripts/create-github-issues.ps1` (see [docs/github-issues/README.md](./github-issues/README.md)) to create **35 tracked issues** with labels `P0`–`P5` and milestones.

---

## Phase 0 — Foundation (1–2 days)

| ID | Task | Done when |
|----|------|-----------|
| 0.1 | Apply `database/supabase_setup.sql` | Tables exist; anon can read live jobs |
| 0.2 | Configure `backend/.env` + `DATABASE_URL` | API starts; `/api/jobs` works |
| 0.3 | Configure `frontend/.env.local` (anon only) | Supabase + API URL set |
| 0.4 | First ingest run | `jobs` rows + `live-jobs.json` updated |
| 0.5 | `backend/requirements.txt` + Docker | Fresh install / `docker build` OK |
| 0.6 | README accurate | No dead file paths |

---

## Phase 1 — Week 1: Live data MVP

| ID | Task | Done when |
|----|------|-----------|
| 1.1 | `.github/workflows/ingest-api.yml` + secrets | Scheduled ingest runs |
| 1.2 | Unify `useLiveJobs` data priority | Single documented chain |
| 1.3 | Enable RRB/DRDO/ISRO RSS | National boards in ingest |
| 1.4 | State PSC batch 1 (KL, PB, HR, …) | ≥20 state scrapers |
| 1.5 | State PSC batch 2 (remaining UTs/states) | All major PSCs covered or documented |
| 1.6 | Weekly portal audit in CI | Broken URLs caught early |
| 1.7 | Validation / noise tuning | &lt;10% junk titles |
| 1.8 | **Exit:** ≥50 live jobs on homepage | Auto-refresh &lt;24h |

**Scraper registry today:** 12 state HTML + ~5 RSS enabled — see `scripts/scraper_registry.json`.

---

## Phase 2 — Month 1: Trust & ops

| ID | Task | Done when |
|----|------|-----------|
| 2.1 | `title_fingerprint` in dedupe | Near-dup titles merged |
| 2.2 | `sources` table sync on ingest | Admin health shows last run |
| 2.3 | React admin dashboard | Moderate jobs without curl |
| 2.4 | PDF parser hardening (10 PDFs) | Dates/vacancies on most |
| 2.5 | `job_posts` / `job_dates` | Multi-post detail in UI |
| 2.6 | Expired job lifecycle | Past deadline hidden |
| 2.7 | Scheduler docs | README matches deploy |

---

## Phase 3 — Month 1: Alerts product

| ID | Task | Done when |
|----|------|-----------|
| 3.1 | Frontend → `POST /api/alerts/subscribe` | DB subscriptions |
| 3.2 | Delivery worker + `alert_deliveries` | Match on new jobs |
| 3.3 | Email (Resend/SendGrid/SMTP) | Test inbox works |
| 3.4 | Telegram bot | Test channel works |
| 3.5 | Web push (optional) | Browser push test |
| 3.6 | Filter UI (state/category) | Targeted alerts |

---

## Phase 4 — Month 2+: Monetization

| ID | Task | Done when |
|----|------|-----------|
| 4.1 | Freemium tiers | Digest vs instant |
| 4.2 | Razorpay/Stripe | One paid plan live |
| 4.3 | Sponsored listings | Admin toggle + UI badge |
| 4.4 | Apply-link analytics | Click tracking |

---

## Phase 5 — Scale

| ID | Task | Done when |
|----|------|-----------|
| 5.1 | Per-portal scraper overrides | Top 5 states custom |
| 5.2 | Celery + Redis (if needed) | Long ingest async |
| 5.3 | FTS on `search_vector` | Search API + UI |
| 5.4 | Sentry + ingest metrics | Errors + run stats |
| 5.5 | Production hardening | CORS, keys, rate limits |

---

## Key paths

| Area | Path |
|------|------|
| Schema | `database/supabase_setup.sql` |
| Scrapers | `scripts/scraper_registry.json`, `backend/app/scrapers/` |
| Ingest | `backend/app/agents/ingest_agent.py` |
| API | `backend/app/routes/` |
| Live UI | `frontend/src/hooks/useLiveJobs.js` |
| Issues JSON | `docs/github-issues/issues.json` |

---

## Daily order (first 7 days)

1. **Day 1–2:** Phase 0  
2. **Day 3–4:** 1.1–1.2 (schedule + data path)  
3. **Day 5–7:** 1.3–1.8 (sources + quality + 50 jobs)
