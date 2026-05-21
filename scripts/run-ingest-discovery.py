#!/usr/bin/env python3
"""Ingest jobs from listing discovery (official apply URLs only)."""
import argparse
import asyncio
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.agents.ingest_agent import IngestAgent  # noqa: E402


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-detail", type=int, default=0, help="Cap detail page fetches (0 = registry default)")
    args = parser.parse_args()

    agent = IngestAgent()
    if not any(s.get("code") == "discovery-listings" for s in agent.registry.get("scrapers", [])):
        print("discovery-listings not in scraper_registry.json")
        sys.exit(1)
    if args.max_detail > 0:
        for i, s in enumerate(agent.registry.get("scrapers", [])):
            if s.get("code") == "discovery-listings":
                agent.registry["scrapers"][i] = {**s, "maxDetailFetches": args.max_detail}
                break

    print("Discovery ingest -> official apply URLs only\n", flush=True)
    row = await agent.run_source("discovery-listings")
    print(
        f"Done: fetched={row.get('fetched', 0)} saved={row.get('saved', 0)} "
        f"rejected={row.get('rejected', 0)} errors={row.get('errors', 0)}"
    )
    if row.get("db_error"):
        print(f"DB: {row['db_error']}")


if __name__ == "__main__":
    asyncio.run(main())
