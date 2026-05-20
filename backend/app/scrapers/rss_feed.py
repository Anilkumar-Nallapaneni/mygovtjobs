"""RSS/Atom fetcher — mirrors scripts/fetch-official-feeds.mjs."""

import json
import re
from pathlib import Path
from typing import Any

import feedparser
import httpx

from app.config import get_settings
from app.scrapers.base import BaseScraper
from app.scrapers.date_utils import parse_published, row_published_at, within_lookback

ROOT = Path(__file__).resolve().parents[3]
SOURCES_PATH = ROOT / "scripts" / "official-sources.json"


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
        user_agent = cfg.get("userAgent", "BharatNaukri/1.0")
        title_filter = target.get("titleMustMatch")
        title_re = re.compile(title_filter, re.I) if title_filter else None
        lookback = int(target.get("lookbackDays") or global_days)
        cap = int(target.get("maxItems") or self.max_items)
        scan_limit = min(500, max(cap * 4, 80))

        async with httpx.AsyncClient(timeout=30, follow_redirects=True, verify=False) as client:
            res = await client.get(url, headers={"User-Agent": user_agent})
            res.raise_for_status()
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
                        __import__("datetime").datetime(*entry.published_parsed[:6], tzinfo=__import__("datetime").timezone.utc)
                    )
                except Exception:
                    published_dt = parse_published(published_raw)
            else:
                published_dt = parse_published(published_raw)

            if not within_lookback(published_dt, days=lookback, unknown_includes=True):
                continue

            published_iso = published_dt.isoformat() if published_dt else None
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
                }
            )
            if len(rows) >= cap:
                break

        rows.sort(key=lambda r: r.get("publishedAt") or "", reverse=True)
        return rows
