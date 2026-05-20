"""Email / Telegram / push subscriptions."""

from sqlalchemy import select

from app.database.session import SessionLocal
from app.models.alert import AlertSubscription
from app.schemas.alert import AlertSubscribeRequest


class AlertService:
    async def subscribe(self, body: AlertSubscribeRequest) -> str:
        async with SessionLocal() as session:
            try:
                existing = (
                    await session.execute(
                        select(AlertSubscription).where(
                            AlertSubscription.channel == body.channel,
                            AlertSubscription.channel_address == body.channel_address.strip(),
                        )
                    )
                ).scalar_one_or_none()
                if existing:
                    return str(existing.id)

                sub = AlertSubscription(
                    channel=body.channel,
                    channel_address=body.channel_address.strip(),
                    state_codes=body.state_codes or [],
                    categories=body.categories or [],
                    qualification_tags=body.qualification_tags or [],
                    is_active=True,
                )
                session.add(sub)
                await session.commit()
                await session.refresh(sub)
                return str(sub.id)
            except Exception:
                await session.rollback()
                return "pending"
