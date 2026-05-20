from fastapi import APIRouter

from app.schemas.alert import AlertSubscribeRequest
from app.services.alert_service import AlertService

router = APIRouter()
service = AlertService()


@router.post("/subscribe")
async def subscribe(body: AlertSubscribeRequest):
    sub_id = await service.subscribe(body)
    return {"id": sub_id, "status": "subscribed"}
