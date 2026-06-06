# Database

Supabase Postgres schema for My Govt Jobs.

## Setup order

1. **`supabase_setup.sql`** — all tables, indexes, RLS, demo rows
2. **`migrations/001_add_whatsapp_alert_channel.sql`** — alert channel enum
3. **`migrations/002_supabase_rls_and_grants.sql`** — grants for anon/authenticated
4. **`migrations/003_ensure_expired_jobs_public_read.sql`** — if REST audit shows `expired: 0` but backend has expired rows

Run each file in the Supabase SQL Editor (or via Supabase CLI migrations if linked).

## Tables

| Table | Access | Purpose |
|-------|--------|---------|
| `sources` | public read | Scraper registry (111 rows) |
| `raw_ingest` | service role only | Staging JSON from scrapers |
| `jobs` | public read live+expired | Main job catalog |
| `job_posts` | public read | Post-level vacancy breakdown |
| `job_dates` | public read | Important dates per job |
| `alert_subscriptions` | public insert | User alert signup |
| `alert_deliveries` | backend only | Sent alert log |

## RLS summary

- `jobs`: `SELECT` where `status IN ('live', 'expired')`
- `sources`: public `SELECT`
- `raw_ingest`: no anon policies
- `alert_subscriptions`: public `INSERT`

## Verify

```bash
npm run supabase:test    # REST + all 7 tables
npm run supabase:audit   # row counts
npm run db:test          # backend DATABASE_URL
npm run env:check        # same Supabase ref in frontend/backend env
```

## Connection strings

- **Backend / ingest:** Transaction pooler, port `6543`, prefix `postgresql+asyncpg://`
- **Never** expose pooler password or `service_role` in frontend env
