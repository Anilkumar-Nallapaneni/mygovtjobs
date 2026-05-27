"""Job queries — Postgres via SQLAlchemy."""

import logging
from datetime import date

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import SessionLocal
from app.models.job import Job
from app.schemas.job import JobOut
from app.utils.official_hosts import (
    collect_official_pdf_urls,
    is_blocked_aggregator_host,
    is_official_recruitment_host,
    pick_best_official_url,
)
from app.utils.sanitize_detail import sanitize_job_detail

logger = logging.getLogger(__name__)


def _escape_like(q: str) -> str:
    return q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


class DatabaseUnavailableError(Exception):
    """Postgres unreachable or query failed unexpectedly."""


def _to_job_out(row: Job) -> JobOut:
    detail = sanitize_job_detail(row.detail or {})
    apply_url = row.apply_url
    if not apply_url or is_blocked_aggregator_host(apply_url) or not is_official_recruitment_host(apply_url or ""):
        pdf_urls = detail.get("pdf_urls") or detail.get("pdfUrls") or []
        candidates = [u for u in pdf_urls if isinstance(u, str)]
        for key in ("notification_url", "link", "source_url", "pdf_url", "pdfUrl"):
            value = detail.get(key)
            if isinstance(value, str):
                candidates.append(value)
        apply_url = pick_best_official_url(candidates) or (
            None if (row.apply_url and is_blocked_aggregator_host(row.apply_url)) else row.apply_url
        )

    pdf_candidates = collect_official_pdf_urls(detail, apply_url)
    pdf_url = detail.get("pdf_url") or detail.get("pdfUrl") or (pdf_candidates[0] if pdf_candidates else None)
    if not pdf_url:
        urls = detail.get("pdf_urls") or detail.get("pdfUrls") or []
        pdf_url = next((u for u in urls if is_official_recruitment_host(u)), None)
    if pdf_url and not is_official_recruitment_host(str(pdf_url)):
        pdf_url = pdf_candidates[0] if pdf_candidates else None
    if not pdf_url and apply_url and ".pdf" in str(apply_url).lower():
        pdf_url = apply_url
    if pdf_candidates:
        detail = {**detail, "pdfUrls": pdf_candidates}
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
        apply_url=apply_url,
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
                q_escaped = _escape_like(q.strip())
                like = f"%{q_escaped}%"
                stmt = stmt.where(
                    or_(
                        Job.title.ilike(like, escape="\\"),
                        Job.dept.ilike(like, escape="\\"),
                    )
                )

            count_stmt = select(func.count()).select_from(stmt.subquery())
            total = (await session.execute(count_stmt)).scalar_one()

            rows = (
                await session.execute(
                    stmt.order_by(Job.published_at.desc().nullslast()).limit(limit).offset(offset)
                )
            ).scalars().all()
            return [_to_job_out(r) for r in rows], int(total)
        except Exception as exc:
            await session.rollback()
            logger.exception("list_jobs failed")
            raise DatabaseUnavailableError from exc
        finally:
            if owns:
                await session.close()

    async def list_jobs_etag(self, session: AsyncSession | None = None) -> str:
        """Cheap fingerprint for HTTP caching of public job lists."""
        owns = session is None
        if owns:
            session = SessionLocal()
        try:
            row = (
                await session.execute(
                    select(func.count(Job.id), func.max(Job.updated_at)).where(
                        Job.status.in_(("live", "expired"))
                    )
                )
            ).one()
            count, updated = row[0], row[1]
            stamp = updated.isoformat() if updated else "none"
            return f'jobs-{count}-{stamp}'
        except Exception:
            return "jobs-0"
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
