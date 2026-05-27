#!/usr/bin/env python3
"""
Daily 8:00 AM IST — official India govt jobs sync (IngestAgent).

Runs once per IST calendar day unless --force.
  1) Sync scraper registry → sources table
  2) All enabled official scrapers → jobs + raw_ingest
  3) Official RSS/portals → jobs
  4) PDF backfill + metadata enrich
  5) Scrub aggregators + export live-jobs.json

Usage (repo root):
  npm run daily:sync
  npm run daily:sync -- --force
"""
from __future__ import annotations

import argparse
import asyncio
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.agents.ingest_agent import IngestAgent  # noqa: E402
from app.database.session import SessionLocal  # noqa: E402
from app.services.daily_sync_service import DailySyncService  # noqa: E402
from app.services.job_persist_service import JobPersistService  # noqa: E402
from app.services.source_sync_service import SourceSyncService  # noqa: E402
from app.services.supabase_audit_service import SupabaseAuditService  # noqa: E402

SOURCE_TIMEOUT_SECONDS = 240
NPM = "npm.cmd" if sys.platform == "win32" else "npm"


async def sync_sources() -> int:
    async with SessionLocal() as session:
        return await SourceSyncService().sync_registry(session)


async def run_ingest() -> tuple[int, int]:
    agent = IngestAgent()
    enabled = [s for s in agent.registry.get("scrapers", []) if s.get("enabled")]
    print(f"=== IngestAgent — {len(enabled)} official sources ===", flush=True)
    saved_total = 0
    for i, entry in enumerate(enabled, 1):
        code = entry.get("code", "?")
        try:
            row = await asyncio.wait_for(agent.run_source(code), timeout=SOURCE_TIMEOUT_SECONDS)
            saved = int(row.get("saved") or 0)
            saved_total += saved
            print(
                f"[{i}/{len(enabled)}] {code}: saved={saved} fetched={row.get('fetched', 0)}",
                flush=True,
            )
        except Exception as exc:
            label = "TIMEOUT" if isinstance(exc, asyncio.TimeoutError) else "FAIL"
            print(f"[{i}/{len(enabled)}] {code}: {label} {exc}", flush=True)
    return len(enabled), saved_total


def run_npm(script: str, *extra: str) -> None:
    cmd = [NPM, "run", script, *extra]
    print(f"\n=== npm run {script} {' '.join(extra)} ===", flush=True)
    subprocess.run(cmd, cwd=ROOT, check=False)


def run_official_import() -> None:
    run_npm("fetch:official")
    subprocess.run(
        ["node", "scripts/run-python.mjs", "scripts/import-official-json-to-db.py"],
        cwd=ROOT,
        check=False,
    )


async def export_and_finish(sources_scraped: int) -> int:
    async with SessionLocal() as session:
        count = await JobPersistService().export_live_jobs_json(session)
        audit = await SupabaseAuditService().table_counts(session)
        for k, v in audit.items():
            print(f"  {k}: {v}", flush=True)
    DailySyncService().daily_sync_json_block(job_count=count, sources_scraped=sources_scraped)
    return count


async def main() -> int:
    parser = argparse.ArgumentParser(description="Daily 8 AM IST official jobs sync")
    parser.add_argument("--force", action="store_true", help="Run even if already completed today (IST)")
    args = parser.parse_args()

    sync = DailySyncService()
    ok, reason = sync.can_start(force=args.force)
    if not ok:
        print(f"SKIP: {reason}", flush=True)
        return 0

    sync.mark_started()
    try:
        n_sources = await sync_sources()
        print(f"Synced {n_sources} sources to database", flush=True)

        scraped, _saved = await run_ingest()
        run_official_import()
        run_npm("backfill:pdfs")
        run_npm("enrich:jobs")
        run_npm("data:scrub")

        job_count = await export_and_finish(scraped)
        print(
            f"\nDone. {job_count} jobs exported. Next automatic run: "
            f"{sync.next_run_ist().strftime('%Y-%m-%d %H:%M %Z')}",
            flush=True,
        )
        return 0
    except Exception as exc:
        sync.mark_failed(str(exc))
        print(f"FAILED: {exc}", flush=True)
        return 1


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
