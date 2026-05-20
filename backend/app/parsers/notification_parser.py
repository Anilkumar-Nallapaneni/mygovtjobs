import json
import re
from pathlib import Path
from typing import Any
from urllib.parse import unquote, urlparse

from app.scrapers.date_utils import row_published_at

_VAC_IN_TITLE = re.compile(r"[–—\-]\s*([\d,]+)\s*posts?\b", re.I)
_ADVT_IN_TITLE = re.compile(r"\b([A-Z]{2,6}/[A-Z0-9/_-]{4,40})\b")
_DATE_DMY = re.compile(r"\b(\d{1,2})[./-](\d{1,2})[./-](\d{4})\b")
_DATE_RANGE_TITLE = re.compile(
    r"(\d{1,2}[./-]\d{1,2}[./-]\d{4})\s*(?:TO|–|—|-)\s*(\d{1,2}[./-]\d{1,2}[./-]\d{4})",
    re.I,
)
_QUAL_IN_TITLE = re.compile(
    r"\b(Any\s+Graduate|Any\s+Post\s+Graduate|10\+2|12TH|10TH|MBA/?PGDM|B\.?Tech/?B\.?E|MBBS)\b",
    re.I,
)

_WEAK_TITLE = re.compile(
    r"^(english|hindi|tamil|telugu|bengali|marathi|gujarati|kannada|malayalam|punjabi|odia|assamese|urdu)"
    r"(\s*[\(\[]?\s*\d|\s*$)|^download\b|^click\s+here|^pdf\b|^notification$",
    re.I,
)

ROOT = Path(__file__).resolve().parents[3]
TEMPLATE_PATH = ROOT / "scripts" / "parser_templates" / "default_notification.json"


def _is_weak_title(title: str) -> bool:
    t = (title or "").strip()
    if len(t) < 10:
        return True
    return bool(_WEAK_TITLE.match(t))


def _title_from_document_url(url: str) -> str | None:
    """Derive a readable title when the portal anchor is e.g. 'English(676 KB)'."""
    if not url:
        return None
    path = unquote(urlparse(url).path)
    m = re.search(r"/([^/]+\.pdf)", path, re.I)
    segment = m.group(1) if m else path.rstrip("/").split("/")[-1]
    if not segment:
        return None
    name = re.sub(r"\.pdf.*$", "", segment, flags=re.I)
    name = re.sub(r"^\d{6,8}_", "", name)
    name = name.replace("+", " ").replace("_", " ").replace("-", " ")
    name = re.sub(r"\s+", " ", name).strip()
    if len(name) < 12:
        return None
    if not re.search(
        r"apprentice|engagement|recruit|advertisement|notification|vacanc|exam|bharti|apply|opening|post",
        name,
        re.I,
    ):
        return None
    return name.title() if name.isupper() else name


class NotificationParser:
    def __init__(self):
        self.template = json.loads(TEMPLATE_PATH.read_text(encoding="utf-8"))

    def _infer_category(self, title: str, dept: str | None) -> str | None:
        probe = f"{title} {dept or ''}"
        for rule in self.template.get("category_rules") or []:
            if re.search(rule.get("pattern", ""), probe, re.I):
                return rule.get("category")
        return None

    def _extract_from_title(self, title: str) -> dict[str, Any]:
        """Parse FreeJobAlert-style titles: 'Apprentice – 7150 Posts', date ranges in APPLY ONLINE rows."""
        out: dict[str, Any] = {}
        if not title:
            return out
        vm = _VAC_IN_TITLE.search(title)
        if vm:
            out["vacancies"] = int(vm.group(1).replace(",", ""))
        adv = _ADVT_IN_TITLE.search(title)
        if adv and "/" in adv.group(1):
            out["advt_no"] = adv.group(1)
        qm = _QUAL_IN_TITLE.search(title)
        if qm:
            out["qualification"] = qm.group(1)
        dr = _DATE_RANGE_TITLE.search(title)
        if dr:
            out["last_date"] = dr.group(2).replace(".", "-")
        else:
            dates = list(_DATE_DMY.finditer(title))
            if dates:
                d, m, y = dates[-1].groups()
                out["last_date"] = f"{y}-{int(m):02d}-{int(d):02d}"
        return out

    def _extract_from_text(self, text: str) -> dict[str, Any]:
        out: dict[str, Any] = {}
        for key, cfg in (self.template.get("fields") or {}).items():
            for pat in cfg.get("patterns") or []:
                m = re.search(pat, text, re.I)
                if m:
                    out[key] = m.group(1).strip()
                    break
        return out

    def parse(self, raw: dict[str, Any], *, pdf_fields: dict[str, Any] | None = None) -> dict[str, Any]:
        """Map raw_ingest JSON → normalized job fields."""
        title = raw.get("title") or "Government recruitment"
        apply_url = raw.get("link") or raw.get("applyUrl")
        pdf_urls = raw.get("pdfUrls") or raw.get("pdf_urls") or []

        if _is_weak_title(title):
            for candidate_url in [*pdf_urls, apply_url]:
                inferred = _title_from_document_url(candidate_url)
                if inferred:
                    title = inferred
                    break
        dept = raw.get("dept") or raw.get("sourceName")
        state = raw.get("state") or "All India"

        title_fields = self._extract_from_title(title)
        text_probe = f"{title} {raw.get('summary') or ''}"
        text_fields = self._extract_from_text(text_probe)
        category = raw.get("category") or self._infer_category(title, dept)

        pdf = pdf_fields or {}
        if pdf.get("apply_urls") and not apply_url:
            apply_url = pdf["apply_urls"][0]

        published_dt = row_published_at(raw)
        published_iso = published_dt.isoformat() if published_dt else raw.get("published") or raw.get("publishedAt")

        merged_pdfs: list[str] = []
        seen_pdf: set[str] = set()

        def _add_pdf(u: str | None) -> None:
            if not u or u in seen_pdf:
                return
            seen_pdf.add(u)
            merged_pdfs.append(u)

        for u in pdf_urls:
            _add_pdf(u)
        if pdf.get("pdf_url"):
            _add_pdf(pdf["pdf_url"])
        if apply_url and re.search(r"\.pdf", apply_url, re.I):
            _add_pdf(apply_url)

        primary_pdf = merged_pdfs[0] if merged_pdfs else pdf.get("pdf_url")

        detail: dict[str, Any] = {
            "source": raw.get("source"),
            "published": published_iso,
            "pdf_urls": merged_pdfs,
            "pdf_url": primary_pdf,
            "notification_url": raw.get("link") or apply_url,
        }
        if pdf.get("summary"):
            detail["summary"] = pdf["summary"]
        if title_fields.get("advt_no"):
            detail["advt_no"] = title_fields["advt_no"]

        vacancies = (
            pdf.get("vacancies")
            or raw.get("vacancies")
            or title_fields.get("vacancies")
            or text_fields.get("vacancies")
            or 0
        )
        last_date = (
            pdf.get("last_date")
            or raw.get("last_date")
            or title_fields.get("last_date")
            or text_fields.get("last_date")
        )
        qualification = (
            pdf.get("qualification")
            or raw.get("qualification")
            or title_fields.get("qualification")
            or text_fields.get("qualification")
        )

        return {
            "title": title,
            "apply_url": apply_url if apply_url and not re.search(r"\.pdf(\?|/|$)", apply_url, re.I) else (apply_url or primary_pdf),
            "pdf_urls": merged_pdfs,
            "dept": dept,
            "state": state,
            "category": category,
            "vacancies": int(vacancies) if vacancies else 0,
            "qualification": qualification,
            "salary": pdf.get("salary") or raw.get("salary"),
            "age_limit": pdf.get("age_limit") or raw.get("age_limit"),
            "last_date": last_date,
            "published_at": published_dt,
            "detail": detail,
        }
