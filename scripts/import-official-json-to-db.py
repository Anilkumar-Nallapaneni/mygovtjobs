#!/usr/bin/env python3
"""Import frontend/public/data/official-feed-items.json into Supabase `jobs`."""
import asyncio
import json
import sys
from datetime import date, datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.database.session import SessionLocal  # noqa: E402
from app.parsers.notification_parser import NotificationParser  # noqa: E402
from app.services.dedupe_service import content_hash  # noqa: E402
from app.services.job_persist_service import JobPersistService  # noqa: E402
from app.services.source_sync_service import SourceSyncService  # noqa: E402
from app.services.validation_service import ValidationService  # noqa: E402

FEED_JSON = ROOT / "frontend" / "public" / "data" / "official-feed-items.json"
SOURCE_CODE = "official-fetch"


def _item_to_raw(item: dict) -> dict:
    return {
        "title": item.get("title"),
        "link": item.get("link"),
        "applyUrl": item.get("link"),
        "source": item.get("sourceId") or SOURCE_CODE,
        "sourceName": item.get("sourceName") or item.get("dept"),
        "publishedAt": item.get("publishedAt"),
        "summary": item.get("summary"),
        "pdfUrls": item.get("pdfUrls") or [],
        "category": item.get("category"),
        "stateIds": item.get("stateIds"),
    }


async def main() -> None:
    if not FEED_JSON.exists():
        print(f"No feed file at {FEED_JSON} — run: npm run fetch:official")
        return

    payload = json.loads(FEED_JSON.read_text(encoding="utf-8"))
    items = payload if isinstance(payload, list) else payload.get("items") or []
    if not items:
        print("official-feed-items.json is empty")
        return

    parser = NotificationParser()
    validator = ValidationService()
    persist = JobPersistService()
    sync = SourceSyncService()
    entry = {
        "code": SOURCE_CODE,
        "sourceName": "Official RSS & portals",
        "module": "rss_feed",
        "enabled": True,
        "category": "Latest",
    }

    saved = 0
    rejected = 0
    async with SessionLocal() as session:
        await sync.ensure_source(session, entry)
        await session.commit()

    for item in items:
        raw = _item_to_raw(item)
        try:
            normalized = parser.parse(raw, source_code=SOURCE_CODE)
        except Exception as exc:
            print(f"skip parse error: {item.get('title', '')[:60]!r} — {exc}")
            rejected += 1
            continue
        normalized["category"] = normalized.get("category") or item.get("category")
        state_ids = item.get("stateIds") or []
        if state_ids and "all" not in state_ids:
            normalized["state_codes"] = [str(s).lower()[:8] for s in state_ids]
        else:
            normalized["state_codes"] = []

        valid, _ = validator.validate(normalized)
        if not valid:
            rejected += 1
            continue

        digest = content_hash(
            title=normalized.get("title", ""),
            apply_url=normalized.get("apply_url"),
            last_date=str(normalized.get("last_date") or ""),
        )
        normalized["content_hash"] = digest

        last = normalized.get("last_date")
        if last and str(last) < date.today().isoformat():
            normalized["status"] = "expired"
        else:
            normalized["status"] = "live"

        async with SessionLocal() as session:
            job = await persist.upsert_normalized(session, normalized)
            if job:
                saved += 1

    async with SessionLocal() as session:
        await persist.export_live_jobs_json(session)

    print(f"official-feed import: items={len(items)} saved={saved} rejected={rejected}")


if __name__ == "__main__":
    asyncio.run(main())
