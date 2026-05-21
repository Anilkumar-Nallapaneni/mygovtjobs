"""Recognize official recruitment hosts (gov + major PSU/bank career portals)."""

from __future__ import annotations

import re
from urllib.parse import urlparse

_BLOCKED_AGGREGATOR = re.compile(
    r"(?:^|\.)(?:freejobalert|sarkariresult|sarkarijob|sarkarinaukri|governmentjob|"
    r"indgovtjobs|rojgarresult|jobriya|fresherslive|employmentnews\.gov)\.",
    re.I,
)

_GOV_TLD = re.compile(r"\.(gov|nic|ac|org|res)\.in$", re.I)

# Career / notification portals (not .gov.in but official employers)
_OFFICIAL_STEMS = (
    "upsc.gov.in",
    "ssc.gov.in",
    "ssc.nic.in",
    "ibps.in",
    "rbi.org.in",
    "sbi.co.in",
    "sbi.bank.in",
    "bankofbaroda.in",
    "bankofbaroda.co.in",
    "icicibank.com",
    "hdfcbank.com",
    "pnbindia.in",
    "centralbankofindia.co.in",
    "unionbankofindia.co.in",
    "canarabank.com",
    "indianbank.in",
    "iob.in",
    "yesbank.in",
    "idbi.bank.in",
    "nabard.org",
    "sebi.gov.in",
    "licindia.in",
    "nalcoindia.com",
    "ongcindia.com",
    "ntpc.co.in",
    "coalindia.in",
    "isro.gov.in",
    "drdo.gov.in",
    "bel-india.in",
    "npcil.nic.in",
    "rrbcdg.gov.in",
    "rrbapply.gov.in",
    "apprenticeshipindia.gov.in",
    "employmentnews.gov.in",
    "indianrailways.gov.in",
    "bceceboard.bihar.gov.in",
    "bceceboard.bihar.gov.in",
    "bfsissc.com",
)

_PSU_PREFIX = re.compile(
    r"^(www\.)?(upsc|ssc|rrb|ibps|isro|drdo|bel|coalindia|ntpc|nhai|esic|aiims|npcil|pib)\.",
    re.I,
)


def hostname_of(url: str) -> str:
    try:
        return (urlparse(url).hostname or "").lower()
    except Exception:
        return ""


def is_blocked_aggregator_host(url: str) -> bool:
    host = hostname_of(url)
    return bool(host and _BLOCKED_AGGREGATOR.search(host))


def is_official_recruitment_host(url: str) -> bool:
    if not url or url == "#":
        return False
    if is_blocked_aggregator_host(url):
        return False
    host = hostname_of(url)
    if not host:
        return False
    if _GOV_TLD.search(host) or host.endswith(".gov"):
        return True
    if _PSU_PREFIX.match(host):
        return True
    if host == "pib.gov.in" or host.endswith(".pib.gov.in"):
        return True
    for stem in _OFFICIAL_STEMS:
        if host == stem or host.endswith("." + stem):
            return True
    return False


_PDF_PATH = re.compile(
    r"\.pdf(\?|#|$)|/pdf/|/writereaddata/|/documents/|/attachments/|/uploads/|notification.*\.pdf|advt.*\.pdf",
    re.I,
)


def looks_like_notification_document(url: str) -> bool:
    if not url:
        return False
    low = url.lower()
    if ".pdf" in low:
        return True
    return bool(_PDF_PATH.search(url))


def collect_official_pdf_urls(detail: dict, apply_url: str | None = None) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []

    def add(u: str | None) -> None:
        if not u or not isinstance(u, str):
            return
        u = u.strip()
        if not u or u in seen:
            return
        if not is_official_recruitment_host(u) or not looks_like_notification_document(u):
            return
        seen.add(u)
        out.append(u)

    for key in ("pdf_url", "pdfUrl", "notification_url"):
        add(detail.get(key))
    for key in ("pdf_urls", "pdfUrls"):
        raw = detail.get(key)
        if isinstance(raw, list):
            for item in raw:
                add(item if isinstance(item, str) else None)
    if apply_url:
        add(apply_url)
    return out


def pick_best_official_url(urls: list[str]) -> str | None:
    """Prefer apply/careers/notification paths over generic homepages."""
    clean = [u for u in urls if is_official_recruitment_host(u)]
    if not clean:
        return None

    def score(u: str) -> int:
        low = u.lower()
        s = 0
        if re.search(r"apply|recruit|career|notification|advt|register|online", low):
            s += 5
        if low.endswith(".pdf") or ".pdf?" in low:
            s += 4
        if "/career" in low or "/recruit" in low:
            s += 3
        if low.count("/") > 4:
            s += 1
        return s

    return max(clean, key=score)
