"""Validation agent — expired jobs, broken links, missing fields, scam filtering."""

import re
from datetime import date, datetime
from typing import Any
from urllib.parse import urlparse

_SCAM = re.compile(
    r"whatsapp|telegram\s*group|pay\s*fee\s*to\s*apply|registration\s*fee\s*only|"
    r"guaranteed\s*job|agent\s*required|call\s*\d{10}",
    re.I,
)
_GOV_HOST = re.compile(r"\.(gov\.in|nic\.in|ac\.in|org\.in)$", re.I)


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


class ValidationService:
    def validate(self, normalized: dict[str, Any]) -> tuple[bool, list[str]]:
        """Return (is_valid, reasons)."""
        reasons: list[str] = []
        title = (normalized.get("title") or "").strip()
        if len(title) < 8:
            reasons.append("title_too_short")

        if _SCAM.search(title) or _SCAM.search(normalized.get("detail", {}).get("summary") or ""):
            reasons.append("scam_pattern")

        apply_url = normalized.get("apply_url") or ""
        if apply_url:
            try:
                host = urlparse(apply_url).hostname or ""
                if host and not _GOV_HOST.search(host) and "pib.gov.in" not in host:
                    # Allow known boards; flag only obvious non-official domains
                    if any(x in host for x in ("bit.ly", "t.me", "wa.me", "goo.gl")):
                        reasons.append("suspicious_link")
            except Exception:
                reasons.append("invalid_url")

        last = _parse_date(normalized.get("last_date"))
        if last and last < date.today():
            reasons.append("expired")

        if not normalized.get("apply_url") and not normalized.get("pdf_urls"):
            reasons.append("missing_link")

        return len(reasons) == 0, reasons
