"""Persist normalized ingest rows to Postgres and JSON snapshot for the UI."""

import json
import re
from datetime import date, datetime, timezone
from pathlib import Path

from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.job import Job
from app.services.dedupe_service import content_hash

_slug_re = re.compile(r"[^a-z0-9]+")


def slugify(title: str, digest: str) -> str:
    base = _slug_re.sub("-", (title or "job").lower()).strip("-")[:80] or "job"
    return f"{base}-{digest[:8]}"


def _resolve_state_codes(normalized: dict) -> list[str]:
    """Nationwide listings use [] in DB; single-state PSC uses e.g. ['ap']."""
    explicit = normalized.get("state_codes")
    if explicit is not None:
        codes = [str(c).lower()[:8] for c in explicit if c and str(c).lower() not in ("all", "all india")]
        return codes
    state_raw = str(normalized.get("state") or "").strip().lower()
    if not state_raw or state_raw in ("all", "all india"):
        source = str((normalized.get("detail") or {}).get("source") or normalized.get("source") or "")
        if source.startswith("psc-"):
            code = source[4:8]
            if code and code not in ("all", "india"):
                return [code]
        return []
    return [state_raw[:8]]


def _parse_date(value) -> date | None:
    if not value:
        return None
    if isinstance(value, date):
        return value
    text = str(value).strip()
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%d.%m.%Y", "%d %b %Y", "%d %B %Y"):
        try:
            return datetime.strptime(text, fmt).date()
        except ValueError:
            continue
    return None


class JobPersistService:
    async def upsert_normalized(self, session: AsyncSession, normalized: dict, *, commit: bool = True) -> Job | None:
        title = (normalized.get("title") or "").strip()
        if not title:
            return None

        apply_url = normalized.get("apply_url")
        last_date = _parse_date(normalized.get("last_date"))
        digest = normalized.get("content_hash") or content_hash(
            title=title, apply_url=apply_url, last_date=str(last_date or "")
        )
        slug = normalized.get("slug") or slugify(title, digest)
        state_codes = _resolve_state_codes(normalized)

        today = date.today()
        if last_date and last_date < today:
            job_status = "expired"
        else:
            job_status = normalized.get("status") or "live"

        pub = normalized.get("published_at")
        if isinstance(pub, datetime):
            published_at = pub if pub.tzinfo else pub.replace(tzinfo=timezone.utc)
        else:
            published_at = _parse_date(pub) or last_date
            if published_at:
                published_at = datetime(
                    published_at.year, published_at.month, published_at.day, tzinfo=timezone.utc
                )
            else:
                published_at = datetime.now(timezone.utc)

        row = {
            "slug": slug,
            "title": title,
            "dept": normalized.get("dept"),
            "category": normalized.get("category"),
            "state_codes": state_codes,
            "vacancies": int(normalized.get("vacancies") or 0),
            "qualification": normalized.get("qualification"),
            "salary": normalized.get("salary"),
            "age_limit": normalized.get("age_limit"),
            "last_date": last_date,
            "apply_url": apply_url,
            "status": job_status,
            "published_at": published_at,
            "normalized_at": datetime.now(timezone.utc),
            "content_hash": digest,
            "detail": normalized.get("detail") or {},
        }

        stmt = (
            insert(Job)
            .values(**row)
            .on_conflict_do_update(
                index_elements=[Job.content_hash],
                set_={
                    "title": row["title"],
                    "dept": row["dept"],
                    "category": row["category"],
                    "state_codes": row["state_codes"],
                    "vacancies": row["vacancies"],
                    "last_date": row["last_date"],
                    "apply_url": row["apply_url"],
                    "published_at": row["published_at"],
                    "normalized_at": row["normalized_at"],
                    "detail": row["detail"],
                    "status": row["status"],
                },
            )
            .returning(Job)
        )
        result = await session.execute(stmt)
        if commit:
            await session.commit()
        return result.scalar_one_or_none()

    async def export_live_jobs_json(self, session: AsyncSession) -> int:
        from app.services.job_service import JobService

        items, _ = await JobService().list_jobs(limit=800, offset=0, session=session)
        payload = {
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "items": [item.model_dump(mode="json") for item in items],
        }
        path = Path(get_settings().live_jobs_json_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        return len(items)
