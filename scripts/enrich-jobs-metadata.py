#!/usr/bin/env python3
"""Re-parse job titles to fill vacancies, last_date, advt_no, PDF links. From repo root:
  backend\\.venv\\Scripts\\python scripts\\enrich-jobs-metadata.py
"""
import asyncio
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from sqlalchemy import select

from app.database.session import SessionLocal
from app.models.job import Job
from app.parsers.notification_parser import NotificationParser
from app.utils.vacancy_extract import sanitize_vacancies
from app.parsers.pdf_parser import parse_pdf_url
from app.scrapers.pdf_discover import ensure_pdf_urls


async def main() -> None:
    parser = NotificationParser()
    updated = 0
    async with SessionLocal() as session:
        rows = (
            await session.execute(select(Job).where(Job.status == "live").order_by(Job.published_at.desc()))
        ).scalars().all()

        for job in rows:
            detail = dict(job.detail or {})
            pdf_urls = list(detail.get("pdf_urls") or [])
            if job.apply_url and ".pdf" in str(job.apply_url).lower():
                pdf_urls.insert(0, job.apply_url)

            pdf_urls = await ensure_pdf_urls(pdf_urls, job.apply_url if ".pdf" not in str(job.apply_url or "").lower() else None)
            pdf_fields = {}
            if pdf_urls:
                pdf_fields = await parse_pdf_url(pdf_urls[0])

            norm = parser.parse(
                {"title": job.title, "link": job.apply_url, "pdfUrls": pdf_urls, "source": detail.get("source")},
                pdf_fields=pdf_fields,
            )
            changed = False
            new_vac = int(norm.get("vacancies") or 0)
            old_vac = int(job.vacancies or 0)
            if new_vac and (
                not old_vac
                or sanitize_vacancies(old_vac, job.title or "") == 0
            ):
                job.vacancies = new_vac
                changed = True
            if norm.get("last_date") and not job.last_date:
                from app.services.job_persist_service import _parse_date

                job.last_date = _parse_date(norm["last_date"])
                changed = True
            if norm.get("qualification") and not job.qualification:
                job.qualification = norm["qualification"]
                changed = True
            nd = norm.get("detail") or {}
            if nd.get("pdf_url") and not detail.get("pdf_url"):
                detail.update(nd)
                job.detail = detail
                changed = True
            if changed:
                updated += 1

        await session.commit()
    print(f"Enriched {updated} jobs.")


if __name__ == "__main__":
    asyncio.run(main())
