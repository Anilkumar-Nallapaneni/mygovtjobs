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
    try:
        from app.database.session import SessionLocal

        async with SessionLocal() as session:
            await session.execute(text("SELECT 1"))
            db_ok = True
    except Exception:
        pass

    return {
        "status": "ok" if db_ok else "degraded",
        "database": {"connected": db_ok},
        "supabase_configured": bool(settings.supabase_url and settings.supabase_service_role_key),
    }
