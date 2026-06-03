"""RSS/Atom fetcher — mirrors scripts/fetch-official-feeds.mjs."""

import json
import re
from pathlib import Path
from typing import Any

from datetime import datetime, timezone

import feedparser

from app.config import get_settings
from app.utils.url_safety import assert_safe_url
from app.scrapers.base import BaseScraper
from app.scrapers.date_utils import parse_published, within_lookback
from app.scrapers.http_client import get_text

ROOT = Path(__file__).resolve().parents[3]
SOURCES_PATH = ROOT / "scripts" / "official-sources.json"

_PDF_IN_HTML = re.compile(r"https?://[^\s\"'<>]+\.pdf", re.I)


def _entry_summary(entry: Any) -> str:
    parts: list[str] = []
    for key in ("summary", "description", "content"):
        val = entry.get(key) if isinstance(entry, dict) else getattr(entry, key, None)
        if not val:
            continue
        if isinstance(val, list):
            for block in val:
                if isinstance(block, dict):
                    parts.append(str(block.get("value") or ""))
                else:
                    parts.append(str(block))
        else:
            parts.append(str(val))
    return " ".join(parts).strip()


def _pdfs_from_entry(entry: Any, link: str) -> list[str]:
    blob = _entry_summary(entry)
    found = [u.replace("&amp;", "&") for u in _PDF_IN_HTML.findall(blob)]
    if link and _PDF_IN_HTML.search(link):
        found.insert(0, link)
    out: list[str] = []
    seen: set[str] = set()
    for u in found:
        if u not in seen:
            seen.add(u)
            out.append(u)
    return out[:8]


class RssFeedScraper(BaseScraper):
    def __init__(
        self,
        feed_id: str | None = None,
        *,
        lookback_days: int | None = None,
        max_items: int | None = None,
    ):
        self.feed_id = feed_id
        settings = get_settings()
        self.lookback_days = lookback_days if lookback_days is not None else settings.ingest_lookback_days
        self.max_items = max_items if max_items is not None else settings.ingest_max_items_per_source

    async def fetch(self) -> list[dict[str, Any]]:
        cfg = json.loads(SOURCES_PATH.read_text(encoding="utf-8"))
        feeds = cfg.get("feeds") or []
        global_days = int(cfg.get("lookbackDays") or self.lookback_days)
        target = next((f for f in feeds if f.get("id") == self.feed_id), feeds[0] if feeds else None)
        if not target or not target.get("feedUrl"):
            return []

        url = target["feedUrl"]
        user_agent = cfg.get("userAgent", "MyGovtJobs/1.0")
        title_filter = target.get("titleMustMatch")
        title_re = re.compile(title_filter, re.I) if title_filter else None
        lookback = int(target.get("lookbackDays") or global_days)
        cap = int(target.get("maxItems") or self.max_items)
        scan_limit = min(500, max(cap * 4, 80))

        assert_safe_url(url)
        res = await get_text(url, user_agent=user_agent)
        parsed = feedparser.parse(res.text)

        rows: list[dict[str, Any]] = []
        for entry in parsed.entries[:scan_limit]:
            title = entry.get("title") or "Official notification"
            if title_re and not title_re.search(title):
                continue
            link = entry.get("link") or ""

            published_raw = entry.get("published") or entry.get("updated")
            if hasattr(entry, "published_parsed") and entry.published_parsed:
                try:
                    published_dt = parse_published(
                        datetime(*entry.published_parsed[:6], tzinfo=timezone.utc)
                    )
                except Exception:
                    published_dt = parse_published(published_raw)
            else:
                published_dt = parse_published(published_raw)

            if not within_lookback(published_dt, days=lookback, unknown_includes=True):
                continue

            published_iso = published_dt.isoformat() if published_dt else None
            summary = _entry_summary(entry)[:2000] or None
            pdf_urls = _pdfs_from_entry(entry, link)

            rows.append(
                {
                    "id": entry.get("id") or link or title,
                    "title": title,
                    "link": link,
                    "dept": target.get("sourceName") or target.get("name"),
                    "sourceName": target.get("sourceName") or target.get("name"),
                    "state": target.get("state") or "All India",
                    "category": target.get("category"),
                    "published": published_iso,
                    "publishedAt": published_iso,
                    "summary": summary,
                    "pdfUrls": pdf_urls,
                }
            )
            if len(rows) >= cap:
                break

        rows.sort(key=lambda r: r.get("publishedAt") or "", reverse=True)
        return rows
