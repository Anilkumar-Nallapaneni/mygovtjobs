"""Fetch and merge structured fields from official notification PDFs."""

from __future__ import annotations

import re
from typing import Any

from app.parsers.pdf_parser import parse_pdf_url

_MAX_PDFS = 6


def _merge_into(target: dict[str, Any], fields: dict[str, Any]) -> None:
    if fields.get("summary"):
        prev = (target.get("summary") or "").strip()
        chunk = str(fields["summary"]).strip()
        if chunk and chunk not in prev:
            target["summary"] = f"{prev}\n{chunk}".strip()[:12_000]

    for key in ("last_date", "qualification", "salary", "age_limit"):
        if fields.get(key) and not target.get(key):
            target[key] = fields[key]

    if fields.get("vacancies"):
        cur = int(target.get("vacancies") or 0)
        nxt = int(fields["vacancies"])
        target["vacancies"] = max(cur, nxt)

    for u in fields.get("apply_urls") or []:
        urls = target.setdefault("apply_urls", [])
        if u and u not in urls:
            urls.append(u)


async def merge_pdf_fields(pdf_urls: list[str] | None) -> dict[str, Any]:
    """Parse up to six PDFs and merge vacancies, dates, qualification, summary."""
    merged: dict[str, Any] = {}
    seen: set[str] = set()

    for url in pdf_urls or []:
        if len(seen) >= _MAX_PDFS:
            break
        if not url or url in seen:
            continue
        if not re.search(r"\.pdf(\?|/|$)", url, re.I):
            continue
        seen.add(url)
        try:
            fields = await parse_pdf_url(url)
        except Exception:
            continue
        _merge_into(merged, fields)

    return merged
