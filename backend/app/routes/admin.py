from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, select

from app.database.session import SessionLocal
from app.middleware.auth import require_admin_key
from app.models.job import Job, Source
from app.config import get_settings
from app.services.daily_sync_service import DailySyncService
from app.services.ingest_service import IngestService
from app.services.supabase_audit_service import SupabaseAuditService

router = APIRouter(dependencies=[Depends(require_admin_key)])


class JobStatusUpdate(BaseModel):
    status: str


@router.get("/stats")
async def admin_stats():
    async with SessionLocal() as session:
        try:
            total = (await session.execute(select(func.count()).select_from(Job))).scalar_one()
            live = (await session.execute(select(func.count()).select_from(Job).where(Job.status == "live"))).scalar_one()
            draft = (await session.execute(select(func.count()).select_from(Job).where(Job.status == "draft"))).scalar_one()
            expired = (await session.execute(select(func.count()).select_from(Job).where(Job.status == "expired"))).scalar_one()
            return {"jobs": {"total": total, "live": live, "draft": draft, "expired": expired}}
        except Exception:
            return {"jobs": {"total": 0, "live": 0, "draft": 0, "expired": 0}}


@router.get("/jobs")
async def admin_list_jobs(status: str | None = None, limit: int = 50, offset: int = 0):
    async with SessionLocal() as session:
        stmt = select(Job).order_by(Job.published_at.desc().nullslast()).limit(limit).offset(offset)
        if status:
            stmt = stmt.where(Job.status == status)
        rows = (await session.execute(stmt)).scalars().all()
        return {
            "items": [
                {
                    "id": r.id,
                    "slug": r.slug,
                    "title": r.title,
                    "status": r.status,
                    "category": r.category,
                    "state_codes": r.state_codes,
                    "published_at": r.published_at,
                }
                for r in rows
            ]
        }


@router.patch("/jobs/{job_id}")
async def admin_update_job(job_id: str, body: JobStatusUpdate):
    if body.status not in ("draft", "live", "expired"):
        raise HTTPException(status_code=400, detail="Invalid status")
    async with SessionLocal() as session:
        row = (await session.execute(select(Job).where(Job.id == job_id))).scalar_one_or_none()
        if not row:
            raise HTTPException(status_code=404, detail="Job not found")
        row.status = body.status
        row.updated_at = datetime.now(timezone.utc)
        await session.commit()
        return {"id": job_id, "status": body.status}


@router.get("/sources/health")
async def source_health():
    import json
    from pathlib import Path

    registry = json.loads((Path(__file__).resolve().parents[3] / "scripts" / "scraper_registry.json").read_text(encoding="utf-8"))
    scrapers = registry.get("scrapers") or []
    async with SessionLocal() as session:
        db_sources = {}
        try:
            rows = (await session.execute(select(Source))).scalars().all()
            db_sources = {r.code: {"last_run_at": r.last_run_at, "last_error": r.last_error} for r in rows}
        except Exception:
            pass

    return {
        "scrapers": [
            {
                "code": s.get("code"),
                "enabled": s.get("enabled", False),
                "module": s.get("module"),
                "last_run_at": db_sources.get(s.get("code"), {}).get("last_run_at"),
                "last_error": db_sources.get(s.get("code"), {}).get("last_error"),
            }
            for s in scrapers
        ]
    }


@router.post("/sources/sync")
async def admin_sync_sources():
    n = await IngestService().sync_sources_registry()
    return {"synced": n}


@router.get("/supabase/audit")
async def admin_supabase_audit():
    async with SessionLocal() as session:
        audit = SupabaseAuditService()
        return {
            "tables": await audit.table_counts(session),
            "live_jobs_by_state": await audit.jobs_by_state(session),
        }


@router.get("/sync-status")
async def admin_sync_status():
    return DailySyncService().public_status()


@router.post("/ingest/run-all")
async def admin_run_ingest(force: bool = Query(False)):
    settings = get_settings()
    sync = DailySyncService()
    if settings.daily_sync_enforce_once and not force:
        ok, reason = sync.can_start(force=False)
        if not ok and sync.already_ran_today_ist():
            raise HTTPException(status_code=409, detail=reason)
    synced = await IngestService().sync_sources_registry()
    results = await IngestService().run_all_enabled()
    return {"sources_synced": synced, "results": results}
