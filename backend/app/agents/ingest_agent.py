import json

import logging

from pathlib import Path



from app.database.session import SessionLocal

from app.parsers.notification_parser import NotificationParser

from app.parsers.pdf_parser import parse_pdf_url
from app.scrapers.pdf_discover import ensure_pdf_urls

from app.scrapers.rss_feed import RssFeedScraper

from app.services.dedupe_service import content_hash

from app.services.job_persist_service import JobPersistService, _resolve_state_codes

from app.services.validation_service import ValidationService



logger = logging.getLogger(__name__)



ROOT = Path(__file__).resolve().parents[3]

REGISTRY_PATH = ROOT / "scripts" / "scraper_registry.json"





class IngestAgent:

    """Runs scraper → parser → validation → dedupe → persist pipeline."""



    def __init__(self):

        self.parser = NotificationParser()

        self.validator = ValidationService()

        self.registry = json.loads(REGISTRY_PATH.read_text(encoding="utf-8"))

        self.persist = JobPersistService()



    async def run_source(self, source_code: str) -> dict:

        entry = next((s for s in self.registry.get("scrapers", []) if s.get("code") == source_code), None)

        if not entry or not entry.get("enabled"):

            return {"source": source_code, "fetched": 0, "saved": 0, "skipped": True}



        scraper = self._scraper_for(entry)

        rows = await scraper.fetch()

        saved = 0

        errors = 0

        rejected = 0



        try:

            async with SessionLocal() as session:

                await session.execute(__import__("sqlalchemy").text("SELECT 1"))

                for raw in rows:

                    try:

                        raw["source"] = source_code

                        apply_link = raw.get("link") or raw.get("applyUrl")
                        pdf_urls = await ensure_pdf_urls(
                            raw.get("pdfUrls") or raw.get("pdf_urls") or [],
                            apply_link,
                        )
                        raw["pdfUrls"] = pdf_urls

                        pdf_fields = {}
                        if pdf_urls:
                            pdf_fields = await parse_pdf_url(pdf_urls[0])



                        normalized = self.parser.parse(raw, pdf_fields=pdf_fields)
                        normalized["category"] = normalized.get("category") or entry.get("category")

                        st = entry.get("state")
                        if st and str(st).lower() not in ("all", "all india"):
                            normalized["state"] = str(st).lower()[:8]
                        else:
                            normalized["state"] = "All India"
                        normalized["state_codes"] = _resolve_state_codes(normalized)

                        valid, reasons = self.validator.validate(normalized)
                        if not valid:
                            rejected += 1
                            if "expired" in reasons or "scam_pattern" in reasons or "suspicious_link" in reasons:
                                continue



                        digest = content_hash(

                            title=normalized.get("title", ""),

                            apply_url=normalized.get("apply_url"),

                            last_date=str(normalized.get("last_date") or ""),

                        )

                        normalized["content_hash"] = digest

                        job = await self.persist.upsert_normalized(session, normalized)

                        if job:

                            saved += 1

                    except Exception as exc:

                        errors += 1

                        logger.warning("ingest row failed: %s", exc)



                try:

                    await self.persist.export_live_jobs_json(session)

                except Exception as exc:

                    logger.warning("live jobs json export failed: %s", exc)

        except Exception as exc:

            logger.warning("database unavailable, exporting ingest snapshot only: %s", exc)

            self._export_fallback_json(rows, entry)



        if rows and saved == 0:

            self._export_fallback_json(rows, entry)



        return {

            "source": source_code,

            "fetched": len(rows),

            "saved": saved,

            "rejected": rejected,

            "errors": errors,

        }



    async def run_all_enabled(self) -> list[dict]:

        results = []

        for entry in self.registry.get("scrapers", []):

            if entry.get("enabled"):

                try:

                    results.append(await self.run_source(entry["code"]))

                except Exception as exc:

                    logger.exception("ingest source %s failed: %s", entry.get("code"), exc)

                    results.append(

                        {"source": entry.get("code"), "fetched": 0, "saved": 0, "errors": 1, "error": str(exc)}

                    )

        return results



    def _scraper_for(self, entry: dict):
        from app.config import get_settings

        settings = get_settings()
        lookback = int(entry.get("lookbackDays") or settings.ingest_lookback_days)
        max_items = int(entry.get("maxItems") or settings.ingest_max_items_per_source)
        module = entry.get("module")

        if module == "rss_feed":
            return RssFeedScraper(
                feed_id=entry.get("feed_id"),
                lookback_days=lookback,
                max_items=max_items,
            )

        if module == "state_portal_html":
            from app.scrapers.state_portal_html import StatePortalHtmlScraper

            return StatePortalHtmlScraper(
                entry.get("portal_url", ""),
                entry.get("state", ""),
                max_items=max_items,
                lookback_days=lookback,
            )

        return RssFeedScraper(lookback_days=lookback, max_items=max_items)



    def _export_fallback_json(self, rows: list, entry: dict) -> None:

        from app.config import get_settings



        items = []

        for raw in rows:

            n = self.parser.parse(raw)

            items.append(

                {

                    "slug": (n.get("title") or "job")[:48].lower().replace(" ", "-"),

                    "title": n.get("title"),

                    "dept": n.get("dept"),

                    "category": n.get("category") or entry.get("category"),

                    "apply_url": n.get("apply_url"),

                    "state_codes": [],

                    "vacancies": 0,

                    "status": "live",

                    "detail": {"source": entry.get("code")},

                }

            )

        path = Path(get_settings().live_jobs_json_path)

        path.parent.mkdir(parents=True, exist_ok=True)

        path.write_text(

            json.dumps({"generatedAt": __import__("datetime").datetime.utcnow().isoformat() + "Z", "items": items}, indent=2),

            encoding="utf-8",

        )


