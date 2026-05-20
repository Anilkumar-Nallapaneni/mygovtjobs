from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, Field


class JobOut(BaseModel):
    id: str
    slug: str
    title: str
    dept: str | None = None
    category: str | None = None
    state_codes: list[str] = Field(default_factory=list)
    vacancies: int = 0
    qualification: str | None = None
    salary: str | None = None
    age_limit: str | None = None
    last_date: date | None = None
    apply_url: str | None = None
    pdf_url: str | None = None
    status: str = "live"
    published_at: datetime | None = None
    detail: dict[str, Any] = Field(default_factory=dict)


class JobListResponse(BaseModel):
    items: list[JobOut]
    total: int
    limit: int
    offset: int
