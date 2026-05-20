"""Job queries — Postgres via SQLAlchemy."""

import logging
from datetime import date

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import SessionLocal
from app.models.job import Job
from app.schemas.job import JobOut

logger = logging.getLogger(__name__)


class DatabaseUnavailableError(Exception):
    """Postgres unreachable or query failed unexpectedly."""


def _to_job_out(row: Job) -> JobOut:
    detail = row.detail or {}
    pdf_url = detail.get("pdf_url") or detail.get("pdfUrl")
    if not pdf_url:
        urls = detail.get("pdf_urls") or detail.get("pdfUrls") or []
        pdf_url = urls[0] if urls else None
    if not pdf_url and row.apply_url and ".pdf" in str(row.apply_url).lower():
        pdf_url = row.apply_url
    return JobOut(
        id=row.id,
        slug=row.slug,
        title=row.title,
        dept=row.dept,
        category=row.category,
        state_codes=list(row.state_codes or []),
        vacancies=row.vacancies or 0,
        qualification=row.qualification,
        salary=row.salary,
        age_limit=row.age_limit,
        last_date=row.last_date,
        apply_url=row.apply_url,
        pdf_url=pdf_url,
        status=row.status or "live",
        published_at=row.published_at,
        detail=detail,
    )


class JobService:
    async def list_jobs(
        self,
        *,
        state=None,
        category=None,
        q=None,
        limit=50,
        offset=0,
        session: AsyncSession | None = None,
    ):
        owns = session is None
        if owns:
            session = SessionLocal()

        try:
            stmt = select(Job).where(Job.status.in_(("live", "expired")))
            if category:
                stmt = stmt.where(Job.category == category)
            if state:
                stmt = stmt.where(or_(Job.state_codes.contains([state]), Job.state_codes == []))
            if q:
                like = f"%{q}%"
                stmt = stmt.where(or_(Job.title.ilike(like), Job.dept.ilike(like)))

            count_stmt = select(func.count()).select_from(stmt.subquery())
            total = (await session.execute(count_stmt)).scalar_one()

            rows = (
                await session.execute(
                    stmt.order_by(Job.published_at.desc().nullslast()).limit(limit).offset(offset)
                )
            ).scalars().all()
            return [_to_job_out(r) for r in rows], int(total)
        except Exception as exc:
            logger.exception("list_jobs failed")
            raise DatabaseUnavailableError from exc
        finally:
            if owns:
                await session.close()

    async def get_by_slug(self, slug: str, session: AsyncSession | None = None) -> JobOut | None:
        owns = session is None
        if owns:
            session = SessionLocal()
        try:
            row = (await session.execute(select(Job).where(Job.slug == slug))).scalar_one_or_none()
            return _to_job_out(row) if row else None
        except Exception as exc:
            logger.exception("get_by_slug failed slug=%s", slug)
            raise DatabaseUnavailableError from exc
        finally:
            if owns:
                await session.close()
