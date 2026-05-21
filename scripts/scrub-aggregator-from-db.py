#!/usr/bin/env python3
"""Remove aggregator URLs and internal discovery fields from jobs + live-jobs.json."""
import asyncio
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from sqlalchemy import select

from app.config import get_settings
from app.database.session import SessionLocal
from app.models.job import Job
from app.utils.official_hosts import is_blocked_aggregator_host, is_official_recruitment_host, pick_best_official_url
from app.utils.sanitize_detail import sanitize_job_detail

LIVE_JSON = ROOT / "frontend" / "public" / "data" / "live-jobs.json"
_BLOCKED = ("freejobalert", "sarkariresult", "sarkarijob", "sarkarinaukri", "indgovtjobs", "rojgarresult")


def _is_agg(url: str | None) -> bool:
    if not url:
        return False
    low = url.lower()
    return any(b in low for b in _BLOCKED) or is_blocked_aggregator_host(url)


async def scrub_db() -> tuple[int, int]:
    fixed = expired = 0
    async with SessionLocal() as session:
        rows = (await session.execute(select(Job))).scalars().all()
        for job in rows:
            detail = sanitize_job_detail(dict(job.detail or {}))
            detail.pop("discovery_ref", None)
            detail.pop("discovered_via", None)
            if detail.get("source") == "discovery-freejobalert":
                detail["source"] = "discovery-listings"

            apply = job.apply_url
            changed = detail != (job.detail or {})

            if _is_agg(apply) or (apply and not is_official_recruitment_host(apply)):
                pdfs = detail.get("pdf_urls") or detail.get("pdfUrls") or []
                official = pick_best_official_url([p for p in pdfs if isinstance(p, str)])
                if official:
                    job.apply_url = official
                    fixed += 1
                    changed = True
                else:
                    job.status = "expired"
                    job.apply_url = None
                    expired += 1
                    changed = True

            if changed:
                job.detail = detail
        await session.commit()
    return fixed, expired


def scrub_live_json() -> int:
    if not LIVE_JSON.exists():
        return 0
    payload = json.loads(LIVE_JSON.read_text(encoding="utf-8"))
    items = payload.get("items") or []
    kept = []
    dropped = 0
    for row in items:
        apply = row.get("apply_url")
        detail = sanitize_job_detail(row.get("detail") or {})
        if detail.get("source") == "discovery-freejobalert":
            detail["source"] = "discovery-listings"
        if _is_agg(apply):
            pdfs = detail.get("pdf_urls") or []
            official = pick_best_official_url(pdfs)
            if official:
                row["apply_url"] = official
            else:
                dropped += 1
                continue
        row["detail"] = detail
        kept.append(row)
    payload["items"] = kept
    LIVE_JSON.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return dropped


async def export_json() -> int:
    from app.services.job_persist_service import JobPersistService

    async with SessionLocal() as session:
        return await JobPersistService().export_live_jobs_json(session)


async def main() -> None:
    fixed, expired = await scrub_db()
    dropped = scrub_live_json()
    exported = await export_json()
    print(f"DB: fixed_apply={fixed} expired_no_official={expired}")
    print(f"live-jobs.json: dropped={dropped}")
    print(f"Re-exported {exported} jobs -> {get_settings().live_jobs_json_path}")


if __name__ == "__main__":
    asyncio.run(main())
