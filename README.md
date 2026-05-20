# BharatNaukri Live

Government job portal — monorepo layout for frontend, Python API, schedulers, and shared ingest scripts.

## Repository layout

```
bharatnaukri-live/
├── frontend/                 # Vite + React UI (existing app)
│   ├── src/
│   │   ├── components/
│   │   ├── i18n/
│   │   ├── data/             # static fallback jobs
│   │   └── ...
│   ├── public/
│   └── scripts/              # i18n build (generate-locale-overrides, flats)
│
├── backend/                  # FastAPI + SQLAlchemy
│   ├── app/
│   │   ├── main.py
│   │   ├── routes/           # jobs, ingest, alerts, health
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/         # job, ingest, dedupe, alerts
│   │   ├── scrapers/         # RSS, state HTML portals
│   │   ├── parsers/          # PDF/HTML notification parsing
│   │   ├── database/
│   │   └── agents/           # ingest orchestration
│   ├── requirements.txt
│   └── Dockerfile
│
├── docs/
│   ├── ROADMAP.md            # Full product roadmap
│   └── github-issues/        # Bulk GitHub issue definitions
│
├── scripts/                  # Shared ingest config (repo root)
│   ├── official-sources.json
│   ├── scraper_registry.json
│   ├── parser_templates/
│   └── fetch-official-feeds.mjs
│
├── database/
│   └── supabase_setup.sql    # Postgres / Supabase (run in SQL editor)
│
└── deployment/
    └── vercel.json           # Frontend hosting
```

## Quick start

### Frontend

From the **repo root** (recommended):

```bash
npm run dev
```

Or from `frontend/`:

```bash
cd frontend
cp .env.example .env.local   # VITE_SUPABASE_*, VITE_API_URL (optional)
npm install
npm run dev
```

Open the URL Vite prints (default **http://localhost:5174/**). The India map loads `/india.svg` from `frontend/public/india.svg`.

### Troubleshooting “page can’t be found” / missing map

The UI was moved into `frontend/`. If an **old** dev server is still running on port 5173 or 5174, it may return 404 because `src/` and `public/` no longer exist at the repo root.

1. Stop every terminal running `npm run dev` (Ctrl+C).
2. From the repo root, run `npm run dev` again.
3. Use the **new** URL from the terminal (e.g. `http://localhost:5174/` or `5175` if 5174 was busy).
4. In the editor, open files under **`frontend/src/`** (e.g. `frontend/src/App.jsx`), not the old root `src/` path.

On Windows you can recreate shortcut folders so old bookmarks work (optional, ignored by git):

```bat
mklink /J src frontend\src
mklink /J public frontend\public
```

From repo root: `npm run dev`

### Backend (local)

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
set DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/bharatnaukri
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

### Database

Apply schema (Supabase SQL editor or local Postgres):

```bash
# Supabase: paste database/supabase_setup.sql in SQL Editor → Run
# Local:  psql $DATABASE_URL -f database/supabase_setup.sql
```

### Official RSS snapshot (frontend ticker)

```bash
npm run fetch:official
# writes frontend/public/data/official-feed-items.json
```

### i18n

```bash
npm run i18n:fill te ta kn   # optional: translate flats
npm run i18n:generate        # frontend/src/i18n/localeOverrides.js
```

## Environment variables

| Variable | Where | Purpose |
|----------|--------|---------|
| `VITE_SUPABASE_URL` | frontend | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | frontend | Public anon key |
| `DATABASE_URL` | backend | Postgres (Supabase connection string) |
| `VITE_API_URL` | frontend | Backend API base (e.g. `http://localhost:8000`) |
| `ADMIN_API_KEY` | backend | Protects `/api/admin/*` and ingest |
| `SUPABASE_SERVICE_ROLE_KEY` | backend (optional) | Server-side Supabase writes |

## Roadmap & GitHub issues

See **[docs/ROADMAP.md](docs/ROADMAP.md)** for the full phased plan (Foundation → Live data → Alerts → Monetization).

Create all **35 tracking issues** on GitHub:

```powershell
$env:GITHUB_TOKEN = "ghp_..."
.\scripts\create-github-issues.ps1
```

Details: [docs/github-issues/README.md](docs/github-issues/README.md)

## Deployment

- **Frontend:** Vercel — `deployment/vercel.json`
- **API:** Docker — `backend/Dockerfile` (Railway / Fly / any host)
- **CI:** `.github/workflows/fetch-official-feeds.yml` (RSS snapshot), `.github/workflows/ingest-api.yml` (API ingest — set secrets)

### Ingest workflow secrets

| Secret | Purpose |
|--------|---------|
| `BHARATNAUKRI_API_URL` | Deployed API base URL |
| `ADMIN_API_KEY` | Same as backend `ADMIN_API_KEY` |

## Status

| System | Status |
|--------|--------|
| Frontend UI + i18n | Working |
| Static jobs + RSS snapshot | Fallback / ticker |
| Postgres schema | `database/supabase_setup.sql` — apply in Supabase |
| Backend API | Implemented (`/api/jobs`, ingest, admin, alerts subscribe) |
| Scrapers / parsers | Partial (~17 sources; not all states) |
| Dedupe + normalization | `content_hash` upsert; PDF/regex parsers basic |
| Alert delivery (email/Telegram/push) | Subscribe API only — no sender yet |
| Admin UI | API only — no React dashboard yet |
| Monetization | Not started |
| Scheduled ingest | `.github/workflows/ingest-api.yml` (needs deployed API + secrets) |
