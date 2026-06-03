# Roadmap checklist (offline)

Use this if you cannot run `create-github-issues.ps1` yet. Check boxes as you complete work.

## Phase 0 — Foundation

- [ ] Run `database/supabase_setup.sql` in Supabase
- [ ] `backend/.env` with `DATABASE_URL`, `ADMIN_API_KEY`
- [ ] `frontend/.env.local` with `VITE_SUPABASE_*`, `VITE_API_URL`
- [ ] `pip install -r backend/requirements.txt` + start API
- [ ] First ingest: `POST /api/admin/ingest/run-all` with `X-Admin-Key`
- [ ] README / env examples reviewed

## Phase 1 — Week 1

- [ ] Secrets: `MYGOVTJOBS_API_URL`, `ADMIN_API_KEY` on GitHub
- [ ] `ingest-api.yml` runs on schedule
- [ ] Unified live data path in `useLiveJobs.js`
- [ ] Enable RRB / DRDO / ISRO RSS
- [ ] State PSC batch 1 (8 states)
- [ ] State PSC batch 2 (remaining)
- [ ] Weekly portal audit in CI
- [ ] Scraper noise / validation tuning
- [ ] **≥50 live jobs on homepage**

## Phase 2 — Month 1 ops

- [ ] `title_fingerprint` dedupe
- [ ] `sources` table sync
- [ ] React admin dashboard
- [ ] PDF parser hardening
- [ ] `job_posts` / `job_dates`
- [ ] Expired job lifecycle
- [ ] Scheduler documented

## Phase 3 — Alerts

- [ ] AlertSection → API
- [ ] Delivery worker
- [ ] Email provider
- [ ] Telegram bot
- [ ] Web push (optional)
- [ ] Filter UI

## Phase 4 — Monetization

- [ ] Freemium tiers
- [ ] Stripe/Razorpay
- [ ] Sponsored listings
- [ ] Apply-link analytics

## Phase 5 — Scale

- [ ] Per-portal overrides
- [ ] Celery (if needed)
- [ ] Full-text search
- [ ] Sentry + metrics
- [ ] Production hardening
