from fastapi import APIRouter, Query

from app.schemas.job import JobListResponse
from app.services.job_service import JobService

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
    items, total = await service.list_jobs(state=state, category=category, q=q, limit=limit, offset=offset)
    return JobListResponse(items=items, total=total, limit=limit, offset=offset)


@router.get("/{slug}")
async def get_job(slug: str):
    job = await service.get_by_slug(slug)
    if not job:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Job not found")
    return job
