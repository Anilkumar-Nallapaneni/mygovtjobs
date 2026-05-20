from fastapi import APIRouter, BackgroundTasks, Depends

from app.middleware.auth import require_admin_key
from app.services.ingest_service import IngestService

router = APIRouter()
service = IngestService()


@router.post("/run/{source_code}", dependencies=[Depends(require_admin_key)])
async def run_source(source_code: str, background_tasks: BackgroundTasks, sync: bool = False):
    """Trigger ingest for one source (admin / scheduler). Pass sync=true to wait for result."""
    if sync:
        result = await service.run_source(source_code)
        return {"queued": False, **result}
    background_tasks.add_task(service.run_source, source_code)
    return {"queued": True, "source": source_code}


@router.post("/run-all", dependencies=[Depends(require_admin_key)])
async def run_all(background_tasks: BackgroundTasks, sync: bool = False):
    if sync:
        results = await service.run_all_enabled()
        return {"queued": False, "results": results}
    background_tasks.add_task(service.run_all_enabled)
    return {"queued": True}
