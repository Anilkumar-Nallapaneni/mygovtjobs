from datetime import datetime
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, String, func
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.job import Base


class AlertSubscription(Base):
    __tablename__ = "alert_subscriptions"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False))
    channel: Mapped[str] = mapped_column(String(32), nullable=False)
    channel_address: Mapped[str] = mapped_column(String(255), nullable=False)
    state_codes: Mapped[list[str] | None] = mapped_column(ARRAY(String(8)))
    categories: Mapped[list[str] | None] = mapped_column(ARRAY(String(64)))
    qualification_tags: Mapped[list[str] | None] = mapped_column(ARRAY(String(64)))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
