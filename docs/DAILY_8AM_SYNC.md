# Daily 8:00 AM IST auto-update

Official India government job listings are refreshed **once per day at 8:00 AM IST** using the **IngestAgent** pipeline (scrapers + RSS + PDF enrich). After that run completes, the site shows the same data until the next morning.

## What runs

| Step | Action |
|------|--------|
| 1 | Sync `scripts/scraper_registry.json` → `sources` table |
| 2 | **IngestAgent** — all enabled official portals (UPSC, SSC, state PSC, banks, etc.) |
| 3 | `npm run fetch:official` + import JSON → DB |
| 4 | `npm run backfill:pdfs` |
| 5 | `npm run enrich:jobs` |
| 6 | `npm run data:scrub` — remove aggregators, export `live-jobs.json` |

State file: `frontend/public/data/daily-sync-state.json`  
Snapshot: `frontend/public/data/live-jobs.json` (includes `dailySync` metadata)

## Run manually

From repo root (requires `backend/.env` with `DATABASE_URL`):

```bash
npm run daily:sync
```

Force a second run the same day:

```bash
npm run daily:sync -- --force
```

## Windows Task Scheduler (your PC at 8 AM)

PowerShell **as Administrator**:

```powershell
cd E:\gov-job-alert-Govt-Jobs
.\scripts\schedule-daily-8am-windows.ps1
```

## GitHub Actions (production / cloud)

Workflow: `.github/workflows/supabase-auto-ingest.yml`  
Cron: `30 2 * * *` (= 8:00 AM IST)

**Secrets required:** `DATABASE_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_API_KEY`

## Frontend behaviour

Set in `frontend/.env.local`:

```env
VITE_DAILY_SYNC_ONLY=1
VITE_JOBS_SOURCE=supabase
```

- Loads jobs from the daily snapshot (cached, no intraday refresh)
- Shows “Updated daily · last sync … IST” on the home page
- API: `GET /api/meta/sync-status`

## Block extra ingests during the day

In `backend/.env`:

```env
DAILY_SYNC_ENFORCE_ONCE=1
```

Manual API ingest (`POST /api/ingest/run-all`) returns **409** if today’s sync already finished. Use `npm run daily:sync -- --force` to override.
