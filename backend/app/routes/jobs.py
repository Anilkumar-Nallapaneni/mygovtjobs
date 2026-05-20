from fastapi import APIRouter, HTTPException, Query

from app.schemas.job import JobListResponse
from app.services.job_service import DatabaseUnavailableError, JobService

router = APIRouter()
service = JobService()


@router.get("", response_model=JobListResponse)
async def list_jobs(
    state: str | None = None,
    category: str | None = None,
    q: str | None = None,
    limit: int = Query(50, ge=1, le=1000),
    offset: int = Query(0, ge=0),
):
    try:
        items, total = await service.list_jobs(state=state, category=category, q=q, limit=limit, offset=offset)
    except DatabaseUnavailableError:
        raise HTTPException(status_code=503, detail="Job database temporarily unavailable")
    return JobListResponse(items=items, total=total, limit=limit, offset=offset, degraded=False)


@router.get("/{slug}")
async def get_job(slug: str):
    try:
        job = await service.get_by_slug(slug)
    except DatabaseUnavailableError:
        raise HTTPException(status_code=503, detail="Job database temporarily unavailable")
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job
