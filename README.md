# BharatNaukri Live

Government job portal — monorepo with React frontend, FastAPI backend, Supabase/Postgres, and shared ingest scripts.

---

## How it works (big picture)

```
Official portals / RSS feeds
        │
        ▼
┌───────────────────────────────────────────────────────────┐
│  INGEST (pick one path)                                   │
│  • npm run ingest:direct      → Python scrapers → DB      │
│  • npm run ingest:all         → via backend API → DB      │
│  • npm run fetch:official     → JSON only (no DB)         │
└───────────────────────────────────────────────────────────┘
        │
        ▼
   Postgres (Supabase)  +  frontend/public/data/live-jobs.json
        │
        ▼
┌───────────────────────────────────────────────────────────┐
│  BACKEND  http://localhost:8000                           │
│  GET /api/jobs  ·  /health  ·  /docs                      │
└───────────────────────────────────────────────────────────┘
        │  (Vite proxy /api → :8000)
        ▼
┌───────────────────────────────────────────────────────────┐
│  FRONTEND  http://localhost:2222                          │
│  useLiveJobs → Supabase + API + live-jobs.json fallback   │
└───────────────────────────────────────────────────────────┘
```

The UI loads jobs from **three sources** (whichever is available):

1. **Supabase** — direct read from `jobs` table (if `VITE_SUPABASE_*` is set)
2. **Backend API** — `GET /api/jobs` from Postgres
3. **Static JSON** — `frontend/public/data/live-jobs.json` (written by ingest or `fetch:official`)

---

## Repository layout

```
bharatnaukri-live/
├── frontend/                 # Vite + React UI (port 2222)
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/useLiveJobs.js
│   │   ├── lib/jobsApi.ts
│   │   └── data/             # static fallback jobs + officialSites.js
│   └── public/data/          # live-jobs.json, official-feed-items.json
│
├── backend/                  # FastAPI + SQLAlchemy (port 8000)
│   ├── app/
│   │   ├── main.py
│   │   ├── routes/           # jobs, ingest, alerts, health, admin
│   │   ├── scrapers/         # RSS, state HTML portals
│   │   ├── parsers/          # PDF/HTML notification parsing
│   │   ├── services/         # job, ingest, dedupe, validation
│   │   └── agents/           # ingest orchestration
│   ├── requirements.txt
│   └── .env                  # DATABASE_URL, ADMIN_API_KEY (create from .env.example)
│
├── scripts/                  # Shared ingest & fetch (run from repo root)
│   ├── official-sources.json
│   ├── scraper_registry.json
│   ├── run-ingest-all.mjs
│   └── run-ingest-direct.py
│
├── database/
│   └── supabase_setup.sql    # Postgres schema — run in Supabase SQL editor
│
└── package.json              # Root npm scripts (dev, ingest, verify, …)
```

---

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| **Node.js** | 18+ | Frontend + fetch/ingest scripts |
| **Python** | 3.11+ | Backend API + direct ingest |
| **Supabase** (or Postgres) | — | Job storage |
| **Git** | — | Clone repo |

---

## Step-by-step: first-time setup

Run these once when setting up the project on a new machine.

### Step 1 — Clone and install Node dependencies

```bash
git clone <your-repo-url>
cd gov-job-alert-Govt-Jobs    # or your folder name

npm install                   # installs root + frontend workspace deps
```

### Step 2 — Create the database (Supabase)

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** → paste contents of `database/supabase_setup.sql` → **Run**.
3. In **Project Settings → Database**, copy the **Connection string** (URI).
   - Use the **Transaction pooler** URL (port `6543`) for the backend.
   - Prefix must be `postgresql+asyncpg://` (not `postgresql://`).

### Step 3 — Backend environment

```bash
cd backend
copy .env.example .env        # Windows
# cp .env.example .env        # macOS / Linux
```

Edit `backend/.env`:

```env
DATABASE_URL=postgresql+asyncpg://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres
SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
ADMIN_API_KEY=<long-random-string>
CORS_ORIGINS=http://localhost:2222,http://127.0.0.1:2222
```

### Step 4 — Python virtual environment

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate
pip install -r requirements.txt

# macOS / Linux
source .venv/bin/activate
pip install -r requirements.txt
```

### Step 5 — Frontend environment

```bash
cd frontend
copy .env.example .env.local   # Windows
# cp .env.example .env.local   # macOS / Linux
```

Edit `frontend/.env.local`:

```env
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>          # public key only — never service_role
VITE_API_URL=                              # leave empty in dev — Vite proxies /api → :8000
```

> **Tip:** Leave `VITE_API_URL` empty during local dev. Vite proxies `/api/*` to `http://127.0.0.1:8000` automatically.

### Step 6 — Verify connections

From **repo root**:

```bash
npm run db:test        # backend → Postgres
npm run supabase:test  # frontend env → Supabase jobs table
```

---

## Step-by-step: run everything locally

You need **two terminals** for full live mode.

### Terminal 1 — Backend API

```bash
cd backend
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS / Linux

uvicorn app.main:app --reload --port 8000
```

| URL | What |
|-----|------|
| http://localhost:8000/docs | Swagger API docs |
| http://localhost:8000/health | Basic health |
| http://localhost:8000/health/detailed | DB connection status |
| http://localhost:8000/api/jobs?limit=10 | Job listings |

### Terminal 2 — Frontend

From **repo root**:

```bash
npm run dev
```

Open **http://localhost:2222/** (configured in `frontend/vite.config.ts`).

### Step 7 — Verify the stack

With both servers running:

```bash
npm run verify
```

Expected: **10/10 checks passed** (frontend, SVG map, live-jobs.json, env, etc.).

---

## Step-by-step: fetch and ingest jobs

Choose the path that fits your goal.

### Path A — Full ingest into database (recommended)

Scrapes official RSS + state portals → parses → dedupes → saves to Postgres → exports `live-jobs.json`.

**Quick test (20 sources):**

```bash
npm run ingest:direct:quick
```

**Full India ingest (all enabled sources in `scraper_registry.json`):**

```bash
npm run ingest:direct
```

Then refresh http://localhost:2222/ — jobs come from Supabase/API.

**What happens inside `ingest:direct`:**

```
scraper_registry.json
    → RssFeedScraper / StatePortalHtmlScraper (per source)
    → NotificationParser (title, dates, PDFs)
    → ValidationService (reject nav links, expired, scams)
    → dedupe (content_hash)
    → JobPersistService → Postgres
    → export_live_jobs_json → frontend/public/data/live-jobs.json
```

### Path B — Ingest via backend HTTP API

Requires backend running on port 8000 and `ADMIN_API_KEY` in `backend/.env`.

```bash
# Terminal 1: uvicorn already running

# Terminal 2:
npm run ingest:all
```

Calls `POST /api/admin/ingest/run-all` with header `X-Admin-Key`. Can take 30–60+ minutes.

**Single source only** (via curl):

```bash
curl -X POST "http://localhost:8000/api/ingest/run/upsc" ^
  -H "X-Admin-Key: YOUR_ADMIN_API_KEY"
```

### Path C — JSON snapshot only (no database)

Fetches RSS + portal HTML → writes JSON files. Good for ticker/fallback without backend.

```bash
npm run fetch:official
# writes:
#   frontend/public/data/official-feed-items.json
#   frontend/public/data/live-jobs.json
```

Optional limits:

```bash
node scripts/fetch-all-official.mjs --limit=25
npm run fetch:official:sites     # portal HTML only
```

### Path D — Post-ingest enrichment

After jobs are in the DB:

```bash
npm run backfill:pdfs    # discover PDF URLs for jobs missing them
npm run enrich:jobs      # re-parse PDFs for vacancies, dates, qualification
```

---

## All npm scripts (repo root)

Run every command from the **repo root** unless noted.

### Development

| Command | What it does |
|---------|----------------|
| `npm run dev` | Start Vite frontend on **http://localhost:2222** |
| `npm run build` | Production build → `frontend/dist/` |
| `npm run lint` | ESLint on frontend |
| `npm run type-check` | TypeScript check (frontend) |
| `npm run verify` | Health-check frontend files + localhost:2222 |

### Database & connections

| Command | What it does |
|---------|----------------|
| `npm run db:test` | Test `DATABASE_URL` from `backend/.env` |
| `npm run supabase:test` | Test `VITE_SUPABASE_*` from `frontend/.env.local` |

### Ingest & fetch

| Command | What it does |
|---------|----------------|
| `npm run ingest:direct` | Full Python ingest → DB + `live-jobs.json` |
| `npm run ingest:direct:quick` | Same, limited to 20 sources |
| `npm run ingest:all` | Trigger ingest via backend API (`ADMIN_API_KEY` required) |
| `npm run fetch:official` | RSS + portals → JSON files (no DB) |
| `npm run fetch:official:sites` | Portal HTML scrape only |
| `npm run fetch:historical` | Historical notification fetch helper |
| `npm run backfill:pdfs` | Backfill missing PDF URLs in DB |
| `npm run enrich:jobs` | Re-enrich job metadata from PDFs |
| `npm run registry:generate` | Regenerate `scraper_registry.json` |
| `npm run audit:official-sites` | Audit portal URLs in officialSites.js |

### i18n

| Command | What it does |
|---------|----------------|
| `npm run i18n:generate` | Build `frontend/src/i18n/localeOverrides.js` |
| `npm run i18n:fill te ta kn` | Optional: auto-translate locale flats |

---

## Backend API reference

Base URL: **http://localhost:8000**

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | — | `{ "status": "ok" }` |
| GET | `/health/detailed` | — | DB + Supabase config status |
| GET | `/api/jobs` | — | List jobs (`?state=od&category=ssc&q=clerk&limit=50`) |
| GET | `/api/jobs/{slug}` | — | Single job by slug |
| GET | `/api/meta/states` | — | State list |
| GET | `/api/meta/categories` | — | Category list |
| POST | `/api/alerts/subscribe` | — | Alert subscription |
| POST | `/api/ingest/run-all` | `X-Admin-Key` | Run all scrapers |
| POST | `/api/ingest/run/{source}` | `X-Admin-Key` | Run one scraper |
| POST | `/api/admin/ingest/run-all` | `X-Admin-Key` | Admin ingest + stats |
| GET | `/api/admin/stats` | `X-Admin-Key` | Job counts |

Interactive docs: **http://localhost:8000/docs**

---

## Environment variables

| Variable | Where | Purpose |
|----------|--------|---------|
| `VITE_SUPABASE_URL` | `frontend/.env.local` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | `frontend/.env.local` | Public anon key (never service_role) |
| `VITE_API_URL` | `frontend/.env.local` | Backend base URL (empty in dev — use Vite proxy) |
| `DATABASE_URL` | `backend/.env` | Postgres via `postgresql+asyncpg://…` |
| `SUPABASE_URL` | `backend/.env` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | `backend/.env` | Server-side Supabase access |
| `ADMIN_API_KEY` | `backend/.env` | Protects `/api/admin/*` and ingest routes |
| `CORS_ORIGINS` | `backend/.env` | Allowed frontend origins (include `:2222`) |
| `INGEST_LOOKBACK_DAYS` | `backend/.env` | How far back scrapers look (default 60) |
| `INGEST_MAX_ITEMS_PER_SOURCE` | `backend/.env` | Max items per source (default 120) |

---

## Daily developer workflow (cheat sheet)

```bash
# 1. Start backend
cd backend && .venv\Scripts\activate && uvicorn app.main:app --reload --port 8000

# 2. Start frontend (new terminal, repo root)
npm run dev

# 3. Check everything
npm run verify

# 4. Pull fresh jobs (pick one)
npm run ingest:direct:quick    # fast DB ingest
npm run fetch:official         # JSON only, no DB

# 5. Open app
# http://localhost:2222
```

---

## Troubleshooting

### Frontend shows “Demo catalog” or very few jobs

1. Confirm backend is running: `curl http://localhost:8000/health`
2. Confirm DB has jobs: `curl "http://localhost:8000/api/jobs?limit=5"`
3. Run ingest: `npm run ingest:direct:quick`
4. Check `frontend/.env.local` has valid `VITE_SUPABASE_*`
5. Hard-refresh the browser (Ctrl+Shift+R)

### API returns 0 jobs but health is OK

Supabase PgBouncer can drop prepared statements on long-running servers. **Restart the backend:**

```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

Check: `curl http://localhost:8000/health/detailed` → `"database": { "connected": true }`

### Cards show “Apply Online” / “Advertisements” instead of job names

Those are portal menu links, not real jobs. Re-run ingest after the latest code — validation and filters now reject them. Refresh http://localhost:2222/

### Page can’t be found / missing India map

The UI lives in `frontend/`. Stop old dev servers and restart:

```bash
npm run dev
```

Use the URL Vite prints (**http://localhost:2222/**). Open files under `frontend/src/`, not a root-level `src/`.

### `npm run ingest:all` fails with 401

Set `ADMIN_API_KEY` in `backend/.env` and ensure backend is running on port 8000.

### Windows: `db:test` or `ingest:direct` not found

Run from repo root. Scripts use `backend/.venv/Scripts/python` — create the venv first (Step 4).

---

## Deployment

| Component | Config |
|-----------|--------|
| **Frontend** | Vercel — `deployment/vercel.json` |
| **API** | Docker — `backend/Dockerfile` |
| **Scheduled RSS** | `.github/workflows/fetch-official-feeds.yml` |
| **Scheduled ingest** | `.github/workflows/ingest-api.yml` |

### GitHub Actions secrets (ingest workflow)

| Secret | Purpose |
|--------|---------|
| `BHARATNAUKRI_API_URL` | Deployed API base URL |
| `ADMIN_API_KEY` | Same as backend `ADMIN_API_KEY` |

---

## Roadmap & GitHub issues

See **[docs/ROADMAP.md](docs/ROADMAP.md)** for the full phased plan.

Create tracking issues:

```powershell
$env:GITHUB_TOKEN = "ghp_..."
.\scripts\create-github-issues.ps1
```

Details: [docs/github-issues/README.md](docs/github-issues/README.md)

---

## Status

| System | Status |
|--------|--------|
| Frontend UI + i18n | Working — http://localhost:2222 |
| Backend API | Working — `/api/jobs`, ingest, alerts |
| Postgres / Supabase schema | `database/supabase_setup.sql` |
| Direct ingest (`ingest:direct`) | Working — scrapers → DB → JSON export |
| JSON fallback (`fetch:official`) | Working — no DB required |
| Portal nav noise filter | Filters menu links like “Advertisements” |
| Alert delivery (email/Telegram/push) | Subscribe API only — no sender yet |
| Admin UI | API only — no React dashboard yet |
| Monetization | Not started |
