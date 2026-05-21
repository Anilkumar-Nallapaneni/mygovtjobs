#!/usr/bin/env python3
"""Full data refresh: discovery listings → all scrapers → scrub → export JSON."""
import asyncio
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.agents.ingest_agent import IngestAgent  # noqa: E402


async def run_discovery() -> None:
    agent = IngestAgent()
    print("=== 1/4 Discovery listings (official apply URLs) ===", flush=True)
    row = await agent.run_source("discovery-listings")
    print(
        f"discovery: fetched={row.get('fetched')} saved={row.get('saved')} "
        f"errors={row.get('errors')}",
        flush=True,
    )


async def run_all_scrapers() -> None:
    agent = IngestAgent()
    enabled = [s for s in agent.registry.get("scrapers", []) if s.get("enabled") and s.get("code") != "discovery-listings"]
    print(f"\n=== 2/4 Official scrapers ({len(enabled)} sources) ===", flush=True)
    for i, entry in enumerate(enabled, 1):
        code = entry.get("code", "?")
        try:
            row = await agent.run_source(code)
            print(
                f"[{i}/{len(enabled)}] {code}: saved={row.get('saved', 0)} "
                f"fetched={row.get('fetched', 0)}",
                flush=True,
            )
        except Exception as exc:
            print(f"[{i}/{len(enabled)}] {code}: FAIL {exc}", flush=True)


def run_node_official() -> None:
    print("\n=== 3/4 fetch:official + import to Supabase ===", flush=True)
    subprocess.run(["npm", "run", "fetch:official"], cwd=ROOT, check=False)
    subprocess.run(
        ["node", "scripts/run-python.mjs", "scripts/import-official-json-to-db.py"],
        cwd=ROOT,
        check=False,
    )


def run_scrub() -> None:
    print("\n=== 4/4 Scrub aggregator links + export live-jobs.json ===", flush=True)
    subprocess.run(["npm", "run", "data:scrub"], cwd=ROOT, check=False)


async def main() -> None:
    await run_discovery()
    await run_all_scrapers()
    run_node_official()
    run_scrub()
    print("\nDone. Restart frontend and hard-refresh the browser.", flush=True)


if __name__ == "__main__":
    asyncio.run(main())
