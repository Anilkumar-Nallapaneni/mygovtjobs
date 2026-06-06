# Agent / developer guide — My Govt Jobs

Government job portal monorepo. Read this before editing code or running ingest.

## Stack

| Layer | Path | Port | Tech |
|-------|------|------|------|
| Frontend | `frontend/` | 2222 | Vite 7, React 18, TypeScript, i18next |
| Backend API | `backend/` | 8000 | FastAPI, SQLAlchemy async, asyncpg |
| Database | Supabase Postgres | — | RLS public read on `jobs`, `sources` |
| Deploy | repo root `vercel.json` | — | Static SPA + Supabase client |
| Ingest | `scripts/` | — | Python scrapers + Node fetch helpers |

## Commands (repo root)

```bash
npm run dev              # frontend :2222
npm run api:dev          # backend :8000
npm run everything       # full CI-like check
npm run verify           # quick stack smoke test
npm run env:check        # frontend/backend Supabase ref alignment
npm run supabase:audit   # table row counts via REST
npm run ingest:direct:quick   # 20 sources → DB + live-jobs.json
```

## Conventions

- **Frontend:** TypeScript only under `frontend/src/` (no `.js`/`.jsx`). See `frontend/FRONTEND_STRUCTURE.md`.
- **Imports:** `@/` alias → `frontend/src/`.
- **Jobs data:** `hooks/useLiveJobs.ts` — static JSON → Supabase → API (`VITE_JOBS_SOURCE`).
- **Deadlines:** use `hooks/useNow.ts` in components (never `Date.now()` in render).
- **PDF links:** `utils/resolvePdfUrl.ts` + `utils/officialDomains.ts` — block aggregators.
- **Backend auth:** `X-Admin-Key` header for `/api/admin/*` and ingest routes.
- **Secrets:** `service_role` only in `backend/.env`. Frontend uses `VITE_SUPABASE_ANON_KEY` only.

## Database

1. Run `database/supabase_setup.sql` in Supabase SQL Editor.
2. Run migrations in `database/migrations/` in order.
3. Backend connects via **Transaction pooler** (`postgresql+asyncpg://…:6543/…`).

## File map

```
frontend/src/
  App.tsx, main.tsx          # shell
  components/                # UI (layout, home, jobs, Maps)
  hooks/useLiveJobs.ts       # job loading
  hooks/useNow.ts            # deadline clock
  lib/jobsApi.ts, supabase.ts
  utils/                     # filters, adapters, PDF, structured detail
  types/job.ts               # shared job types
  i18n/                      # 22+ locales

backend/app/
  main.py                    # FastAPI app
  routes/                    # jobs, ingest, alerts, admin, health, meta
  services/                  # job, ingest, persist, validation
  scrapers/, parsers/, agents/

scripts/                     # ingest, audit, fetch, env helpers
database/                    # SQL setup + migrations
docs/                        # install, deploy, components
```

## PR checklist

```bash
npm run check:frontend && npm run type-check && npm run lint && npm run test && npm run build
```

## Do not

- Commit `.env` / `.env.local` (use `.env.example` templates).
- Put `service_role` in `VITE_*` env vars.
- Add `.js` React files under `frontend/src/`.
- Deploy using `frontend/vercel.json` — use **root** `vercel.json`.
