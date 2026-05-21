"""Extract structured fields from government notification PDFs."""

import io
import re
from typing import Any

import httpx
from pypdf import PdfReader

from app.utils.url_safety import assert_safe_url
from app.utils.vacancy_extract import extract_vacancies, sanitize_vacancies

_MAX_BYTES = 20 * 1024 * 1024

_VACANCY = re.compile(
    r"(\d{1,6})\s*(?:posts?|vacancies|vacancy|पद|positions?|training\s+seats?)|"
    r"(?:total\s*\*+\s*|total\s+)(\d{1,6})",
    re.I,
)
_LAST_DATE = re.compile(
    r"(?:last\s*date|closing\s*date|apply\s*by|अंतिम\s*तिथि)[:\s]+(\d{1,2}[\-/\.]\d{1,2}[\-/\.]\d{2,4})",
    re.I,
)
_QUAL = re.compile(
    r"(?:qualification|eligibility|essential\s*qualification|योग्यता)[:\s]+(.{10,200}?)(?:\n|$)",
    re.I,
)
_SALARY = re.compile(r"(?:pay\s*scale|salary|emoluments|level[\-\s]*\d+)[:\s]+(.{5,120}?)(?:\n|$)", re.I)
_AGE = re.compile(r"(?:age\s*limit|age\s*as\s*on)[:\s]+(.{5,80}?)(?:\n|$)", re.I)
_URL = re.compile(r"https?://[^\s<>\"']+", re.I)


async def fetch_pdf_text(url: str, *, timeout: float = 25) -> str:
    assert_safe_url(url)
    async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
        async with client.stream(
            "GET",
            url,
            headers={
                "User-Agent": (
                    "Mozilla/5.0 (compatible; BharatNaukri/1.0; +https://github.com/gov-job-alert)"
                )
            },
        ) as res:
            res.raise_for_status()
            buf = io.BytesIO()
            size = 0
            async for chunk in res.aiter_bytes():
                size += len(chunk)
                if size > _MAX_BYTES:
                    raise ValueError("PDF too large")
                buf.write(chunk)
            reader = PdfReader(buf)
            parts: list[str] = []
            for page in reader.pages[:12]:
                parts.append(page.extract_text() or "")
            return "\n".join(parts)


def extract_fields(text: str) -> dict[str, Any]:
    if not text or len(text.strip()) < 20:
        return {}

    out: dict[str, Any] = {}
    vac = extract_vacancies(text)
    if vac:
        out["vacancies"] = vac
    elif _VACANCY.search(text):
        m = _VACANCY.search(text)
        num = m.group(1) or m.group(2)
        if num:
            out["vacancies"] = sanitize_vacancies(int(num))

    ld = _LAST_DATE.search(text)
    if ld:
        out["last_date"] = ld.group(1)

    qual = _QUAL.search(text)
    if qual:
        out["qualification"] = qual.group(1).strip()[:500]

    sal = _SALARY.search(text)
    if sal:
        out["salary"] = sal.group(1).strip()[:200]

    age = _AGE.search(text)
    if age:
        out["age_limit"] = age.group(1).strip()[:120]

    urls = _URL.findall(text)
    if urls:
        out["apply_urls"] = urls[:5]

    out["summary"] = " ".join(text.split())[:600]
    return out


async def parse_pdf_url(url: str) -> dict[str, Any]:
    try:
        text = await fetch_pdf_text(url)
        fields = extract_fields(text)
        fields["pdf_url"] = url
        return fields
    except Exception:
        return {"pdf_url": url}
