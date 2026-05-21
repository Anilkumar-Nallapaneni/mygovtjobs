#!/usr/bin/env python3
"""
Full Supabase sync:
  1) Sync all scrapers → `sources`
  2) Discovery + all enabled scrapers → `raw_ingest` + `jobs`
  3) Official RSS/portals JSON → `jobs`
  4) Scrub + export + audit
"""
import asyncio
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.agents.ingest_agent import IngestAgent  # noqa: E402
from app.database.session import SessionLocal  # noqa: E402
from app.services.source_sync_service import SourceSyncService  # noqa: E402
from app.services.supabase_audit_service import SupabaseAuditService  # noqa: E402


async def sync_sources() -> int:
    async with SessionLocal() as session:
        return await SourceSyncService().sync_registry(session)


async def run_ingest() -> None:
    agent = IngestAgent()
    print("=== Discovery listings ===", flush=True)
    d = await agent.run_source("discovery-listings")
    print(f"discovery: fetched={d.get('fetched')} saved={d.get('saved')}", flush=True)

    enabled = [
        s
        for s in agent.registry.get("scrapers", [])
        if s.get("enabled") and s.get("code") != "discovery-listings"
    ]
    print(f"\n=== Scrapers ({len(enabled)}) ===", flush=True)
    for i, entry in enumerate(enabled, 1):
        code = entry.get("code", "?")
        try:
            row = await agent.run_source(code)
            print(
                f"[{i}/{len(enabled)}] {code}: saved={row.get('saved', 0)} fetched={row.get('fetched', 0)}",
                flush=True,
            )
        except Exception as exc:
            print(f"[{i}/{len(enabled)}] {code}: FAIL {exc}", flush=True)


def run_official_import() -> None:
    print("\n=== fetch:official + import to DB ===", flush=True)
    subprocess.run(["npm", "run", "fetch:official"], cwd=ROOT, check=False)
    subprocess.run(
        ["node", "scripts/run-python.mjs", "scripts/import-official-json-to-db.py"],
        cwd=ROOT,
        check=False,
    )


def run_scrub() -> None:
    print("\n=== Scrub + export live-jobs.json ===", flush=True)
    subprocess.run(["npm", "run", "data:scrub"], cwd=ROOT, check=False)


async def audit() -> None:
    print("\n=== Supabase table audit ===", flush=True)
    async with SessionLocal() as session:
        counts = await SupabaseAuditService().table_counts(session)
        for k, v in counts.items():
            print(f"  {k}: {v}", flush=True)


async def main() -> None:
    n = await sync_sources()
    print(f"Synced {n} sources to Supabase", flush=True)
    await run_ingest()
    run_official_import()
    run_scrub()
    await audit()
    print("\nDone. Use VITE_JOBS_SOURCE=api or supabase on the frontend.", flush=True)


if __name__ == "__main__":
    asyncio.run(main())
