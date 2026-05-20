from fastapi import APIRouter, HTTPException

from app.schemas.alert import AlertSubscribeRequest
from app.services.alert_service import AlertService, AlertSubscriptionError

router = APIRouter()
service = AlertService()


@router.post("/subscribe")
async def subscribe(body: AlertSubscribeRequest):
    try:
        sub_id = await service.subscribe(body)
    except AlertSubscriptionError:
        raise HTTPException(status_code=503, detail="Could not save subscription. Please try again later.")
    return {"id": sub_id, "status": "subscribed"}
