"""Admin API key verification."""

from fastapi import Header, HTTPException

from app.config import get_settings


async def require_admin_key(x_admin_key: str | None = Header(default=None, alias="X-Admin-Key")) -> None:
    settings = get_settings()
    expected = settings.admin_api_key
    if not expected:
        return
    if not x_admin_key or x_admin_key != expected:
        raise HTTPException(status_code=401, detail="Invalid or missing admin API key")
