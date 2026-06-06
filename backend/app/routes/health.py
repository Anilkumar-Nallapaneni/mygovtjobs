from fastapi import APIRouter

from sqlalchemy import text

from app.config import get_settings

router = APIRouter()


@router.get("/health")
async def health():
    return {"status": "ok"}


@router.get("/health/detailed")
async def health_detailed():
    settings = get_settings()
    db_ok = False
    job_counts: dict[str, int] = {}
    try:
        from app.database.session import SessionLocal

        async with SessionLocal() as session:
            await session.execute(text("SELECT 1"))
            db_ok = True
            rows = (
                await session.execute(
                    text(
                        "SELECT COALESCE(status, 'unknown') AS status, count(*) "
                        "FROM jobs GROUP BY status ORDER BY count DESC"
                    )
                )
            ).all()
            for status, count in rows:
                job_counts[str(status)] = int(count)
    except Exception:
        pass

    visible = job_counts.get("live", 0) + job_counts.get("expired", 0)

    return {
        "status": "ok" if db_ok else "degraded",
        "database": {"connected": db_ok},
        "supabase_configured": bool(settings.supabase_url and settings.supabase_service_role_key),
        "jobs": {
            "by_status": job_counts,
            "visible_public": visible,
        },
    }
