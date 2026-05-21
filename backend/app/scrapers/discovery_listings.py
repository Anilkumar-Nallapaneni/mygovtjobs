"""
Discover latest notifications from public listing tables; resolve official apply URLs only.
"""

from __future__ import annotations

import asyncio
import re
from datetime import datetime, timezone
from typing import Any
from urllib.parse import urljoin

import httpx
from bs4 import BeautifulSoup

from app.config import get_settings
from app.scrapers.base import BaseScraper
from app.scrapers.date_utils import within_lookback
from app.utils.official_hosts import is_blocked_aggregator_host, is_official_recruitment_host, pick_best_official_url
from app.utils.url_safety import assert_safe_url
from app.utils.vacancy_extract import extract_vacancies

_SOURCE = "discovery-listings"
_DEFAULT_LIST_URL = "https://www.freejobalert.com/latest-notifications/"
_BLOCKED_DETAIL = re.compile(r"freejobalert|sarkariresult|sarkarijob|sarkarinaukri", re.I)

_SECTION_CATEGORY: dict[str, str] = {
    "banks": "banking",
    "other govt finance": "banking",
    "upsc": "upsc",
    "ssc": "ssc",
    "railways": "railways",
    "defence": "defence",
    "medical jobs": "health",
    "other all india": "state",
    "all india fellow": "state",
}

_STATE_SECTIONS: dict[str, str] = {
    "andhra pradesh": "ap",
    "arunachal pradesh": "ar",
    "assam": "as",
    "bihar": "br",
    "chhattisgarh": "cg",
    "delhi": "dl",
    "gujarat": "gj",
    "haryana": "hr",
    "himachal pradesh": "hp",
    "jammu and kashmir": "jk",
    "jharkhand": "jh",
    "karnataka": "ka",
    "kerala": "kl",
    "madhya pradesh": "mp",
    "maharashtra": "mh",
    "manipur": "mn",
    "meghalaya": "ml",
    "mizoram": "mz",
    "nagaland": "nl",
    "odisha": "od",
    "punjab": "pb",
    "rajasthan": "rj",
    "sikkim": "sk",
    "tamil nadu": "tn",
    "telangana": "ts",
    "tripura": "tr",
    "uttar pradesh": "up",
    "uttarakhand": "uk",
    "west bengal": "wb",
    "goa": "ga",
    "chandigarh": "ch",
}


def _parse_dmy(text: str) -> str | None:
    m = re.search(r"(\d{1,2})[./-](\d{1,2})[./-](\d{4})", text or "")
    if not m:
        return None
    d, mo, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
    if y < 2000 or mo < 1 or mo > 12 or d < 1 or d > 31:
        return None
    return f"{y}-{mo:02d}-{d:02d}"


def _section_meta(heading: str) -> tuple[str | None, list[str]]:
    key = re.sub(r"\s+", " ", (heading or "").strip().lower())
    cat = _SECTION_CATEGORY.get(key)
    state = _STATE_SECTIONS.get(key)
    state_codes = [state] if state else []
    if not cat and state:
        cat = "state"
    return cat, state_codes


class DiscoveryListingsScraper(BaseScraper):
    def __init__(
        self,
        *,
        list_url: str | None = None,
        lookback_days: int | None = None,
        max_items: int | None = None,
        max_detail_fetches: int | None = None,
    ):
        settings = get_settings()
        self.list_url = (list_url or _DEFAULT_LIST_URL).strip()
        self.lookback_days = lookback_days if lookback_days is not None else settings.ingest_lookback_days
        self.max_items = max_items if max_items is not None else 600
        self.max_detail_fetches = max_detail_fetches if max_detail_fetches is not None else 350

    async def fetch(self) -> list[dict[str, Any]]:
        assert_safe_url(self.list_url)
        headers = {
            "User-Agent": "BharatNaukriDiscovery/1.0 (+official-link-resolver)",
            "Accept": "text/html,application/xhtml+xml",
            "Accept-Language": "en-IN,en;q=0.9",
        }
        async with httpx.AsyncClient(
            follow_redirects=True,
            timeout=httpx.Timeout(35.0),
            headers=headers,
        ) as client:
            res = await client.get(self.list_url)
            res.raise_for_status()
            rows = self._parse_listing(res.text)

        rows = rows[: self.max_items]
        if not rows:
            return []

        sem = asyncio.Semaphore(10)
        detail_budget = [self.max_detail_fetches]
        out: list[dict[str, Any]] = []

        async with httpx.AsyncClient(
            follow_redirects=True,
            timeout=httpx.Timeout(25.0),
            headers=headers,
        ) as client:
            self._detail_client = client

            async def resolve_row(row: dict[str, Any]) -> dict[str, Any] | None:
                official = row.get("official_url")
                if not official and detail_budget[0] > 0 and row.get("_detail_page"):
                    detail_budget[0] -= 1
                    async with sem:
                        official = await self._official_from_detail_page(row["_detail_page"])
                if not official or is_blocked_aggregator_host(official):
                    return None
                title = row["title"]
                vac = extract_vacancies(title, title=title)
                return {
                    "title": title,
                    "link": official,
                    "applyUrl": official,
                    "source": _SOURCE,
                    "sourceName": row.get("board") or "Government recruitment",
                    "dept": row.get("board"),
                    "category": row.get("category"),
                    "state": row.get("state_label") or "All India",
                    "state_codes": row.get("state_codes") or [],
                    "vacancies": vac,
                    "last_date": row.get("last_date"),
                    "published": row.get("post_date"),
                    "qualification": row.get("qualification"),
                    "summary": row.get("summary"),
                    "pdfUrls": row.get("pdf_urls") or [],
                    "detail": {
                        "source": _SOURCE,
                        "advt_no": row.get("advt_no"),
                        "board": row.get("board"),
                    },
                }

            resolved = await asyncio.gather(*[resolve_row(r) for r in rows], return_exceptions=True)
            for item in resolved:
                if isinstance(item, dict):
                    out.append(item)
        return out

    def _parse_listing(self, html: str) -> list[dict[str, Any]]:
        soup = BeautifulSoup(html, "html.parser")
        category: str | None = "state"
        state_codes: list[str] = []
        state_label = "All India"
        rows: list[dict[str, Any]] = []
        seen: set[str] = set()

        for el in soup.find_all(["h4", "h3", "h2", "table"]):
            if el.name in ("h4", "h3", "h2"):
                text = el.get_text(" ", strip=True)
                if text and len(text) < 80:
                    category, state_codes = _section_meta(text)
                    state_label = text if state_codes else "All India"
                continue

            if el.name != "table":
                continue
            for tr in el.find_all("tr"):
                cells = tr.find_all(["td", "th"])
                if len(cells) < 6:
                    continue
                texts = [c.get_text(" ", strip=True) for c in cells]
                if texts[0].lower() in ("post date", "postdate"):
                    continue
                if "no jobs are currently available" in " ".join(texts).lower():
                    continue

                post_date = _parse_dmy(texts[0])
                board = texts[1]
                post_name = texts[2]
                qualification = texts[3] if len(texts) > 3 else ""
                advt_no = texts[4] if len(texts) > 4 else ""
                last_date = _parse_dmy(texts[5]) if len(texts) > 5 else None

                detail_a = tr.find("a", href=True, string=re.compile(r"get\s+details|view\s+details", re.I))
                if not detail_a:
                    detail_a = tr.find("a", href=re.compile(r"/articles/", re.I))
                detail_page = urljoin(self.list_url, detail_a["href"]) if detail_a else None

                title = f"{board} — {post_name}".strip(" —")
                if len(title) < 12 or not detail_page:
                    continue
                if detail_page in seen:
                    continue
                seen.add(detail_page)

                if last_date:
                    try:
                        ld = datetime.strptime(last_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
                    except ValueError:
                        ld = None
                    if ld and not within_lookback(ld, days=self.lookback_days, unknown_includes=False):
                        continue

                rows.append(
                    {
                        "title": title,
                        "board": board,
                        "_detail_page": detail_page,
                        "official_url": None,
                        "post_date": post_date,
                        "last_date": last_date,
                        "qualification": qualification or None,
                        "advt_no": advt_no if advt_no and advt_no != "–" else None,
                        "category": category,
                        "state_codes": state_codes,
                        "state_label": state_label,
                        "summary": f"{board}: {post_name}"[:500],
                        "pdf_urls": [],
                    }
                )
        return rows

    async def _official_from_detail_page(self, url: str) -> str | None:
        try:
            assert_safe_url(url)
            res = await self._detail_client.get(url)
            if res.status_code >= 400:
                return None
            return self._extract_official_from_html(res.text, base_url=url)
        except Exception:
            return None

    def _extract_official_from_html(self, html: str, *, base_url: str) -> str | None:
        soup = BeautifulSoup(html, "html.parser")
        candidates: list[str] = []

        for a in soup.find_all("a", href=True):
            href = urljoin(base_url, a["href"].strip())
            if not href.startswith("http"):
                continue
            if is_blocked_aggregator_host(href) or _BLOCKED_DETAIL.search(href):
                continue
            if is_official_recruitment_host(href):
                candidates.append(href)

        text = soup.get_text("\n", strip=True)
        for m in re.finditer(r"https?://[^\s\]<\"']+", text):
            href = m.group(0).rstrip(").,;]")
            if is_official_recruitment_host(href) and not _BLOCKED_DETAIL.search(href):
                candidates.append(href)

        pdf_urls = re.findall(r"https?://[^\s\"']+\.pdf", html, flags=re.I)
        for p in pdf_urls:
            if is_official_recruitment_host(p):
                candidates.append(p)

        return pick_best_official_url(candidates)
