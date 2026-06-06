#!/usr/bin/env python3
"""Import sanitized jobs from a local recruitment catalog into Supabase."""
from __future__ import annotations

import argparse
import asyncio
import csv
import json
import os
import re
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.database.session import SessionLocal  # noqa: E402
from app.services.dedupe_service import content_hash  # noqa: E402
from app.services.job_persist_service import JobPersistService  # noqa: E402
from app.services.source_sync_service import SourceSyncService  # noqa: E402
from app.services.validation_service import ValidationService  # noqa: E402
from app.utils.catalog_import_sanitize import collect_apply_links, sanitize_raw_job  # noqa: E402
from app.utils.official_hosts import (  # noqa: E402
    collect_official_pdf_urls,
    looks_like_notification_document,
    pick_best_official_url,
)
from app.utils.vacancy_extract import extract_vacancies, resolve_vacancies  # noqa: E402

SOURCE_CODE = "structured-import"
_catalog_env = os.environ.get("RECRUITMENT_CATALOG_PATH", "").strip()
DEFAULT_DATA_DIR = Path(_catalog_env) if _catalog_env else None

SOURCE_PAGE_STATE: dict[str, list[str]] = {
    "andhra-pradesh": ["ap"],
    "assam": ["as"],
    "bihar": ["br"],
    "chhattisgarh": ["cg"],
    "delhi": ["dl"],
    "gujarat": ["gj"],
    "haryana": ["hr"],
    "himachal-pradesh": ["hp"],
    "jharkhand": ["jh"],
    "karnataka": ["ka"],
    "kerala": ["kl"],
    "madhya-pradesh": ["mp"],
    "maharashtra": ["mh"],
    "odisha": ["od"],
    "punjab": ["pb"],
    "rajasthan": ["rj"],
    "tamil-nadu": ["tn"],
    "telangana": ["tg"],
    "uttar-pradesh": ["up"],
    "uttarakhand": ["uk"],
    "west-bengal": ["wb"],
}

SOURCE_PAGE_CATEGORY: dict[str, str] = {
    "bank": "banking",
    "railway": "railways",
    "teaching": "teaching",
}


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Import recruitment catalog JSON/CSV into Supabase")
    parser.add_argument(
        "--source",
        default=str(DEFAULT_DATA_DIR) if DEFAULT_DATA_DIR else "",
        help="Path to local catalog folder (jobs/ + optional csv/); or set RECRUITMENT_CATALOG_PATH",
    )
    parser.add_argument("--limit", type=int, default=0, help="Max jobs to import (0 = all)")
    parser.add_argument(
        "--csv",
        default="",
        help="Job catalog CSV (default: {source}/csv/all_jobs.csv when present)",
    )
    parser.add_argument("--dry-run", action="store_true", help="Parse only; do not write to DB")
    return parser.parse_args()


def _find_job_files(data_dir: Path) -> list[Path]:
    jobs_dir = data_dir / "jobs"
    if not jobs_dir.is_dir():
        return []
    files: list[Path] = []
    for category in sorted(jobs_dir.iterdir()):
        if not category.is_dir():
            continue
        for path in sorted(category.glob("*.json")):
            files.append(path)
    return files


def _merge_job_record(by_id: dict[str, dict], raw: dict) -> None:
    job_id = str(raw.get("job_id") or (raw.get("listing") or {}).get("job_id") or "")
    if not job_id:
        return
    prev = by_id.get(job_id)
    if not prev:
        by_id[job_id] = raw
        return
    prev_links = len(collect_apply_links(prev))
    new_links = len(collect_apply_links(raw))
    if new_links >= prev_links:
        by_id[job_id] = raw


def _load_job_json(jobs_dir: Path, source_page: str, job_id: str) -> dict | None:
    if source_page:
        path = jobs_dir / source_page / f"{job_id}.json"
        if path.is_file():
            return json.loads(path.read_text(encoding="utf-8"))
    matches = sorted(jobs_dir.glob(f"**/{job_id}.json"))
    if matches:
        return json.loads(matches[0].read_text(encoding="utf-8"))
    return None


def _csv_row_to_raw(row: dict[str, str]) -> dict:
    job_id = str(row.get("job_id") or "").strip()
    title = (row.get("title") or row.get("exam_post_name") or "").strip()
    return {
        "job_id": job_id,
        "listing": {
            "job_id": job_id,
            "source_page": (row.get("source_page") or "").strip(),
            "section": (row.get("section") or "").strip(),
            "post_date": (row.get("post_date") or "").strip(),
            "recruitment_board": (row.get("recruitment_board") or "").strip(),
            "exam_post_name": (row.get("exam_post_name") or "").strip(),
            "qualification": (row.get("qualification") or "").strip(),
            "advt_no": (row.get("advt_no") or "").strip(),
            "last_date": (row.get("last_date") or "").strip(),
        },
        "detail": {
            "title": title,
            "summary": (row.get("summary") or "").strip(),
            "apply_links": [],
            "links": [],
            "sections": [],
        },
    }


def _resolve_csv_path(data_dir: Path, csv_arg: str) -> Path | None:
    if csv_arg.strip():
        path = Path(csv_arg.strip())
        return path if path.is_file() else None
    default = data_dir / "csv" / "all_jobs.csv"
    return default if default.is_file() else None


def _load_deduped_jobs(data_dir: Path, csv_path: Path | None = None) -> list[dict]:
    by_id: dict[str, dict] = {}
    jobs_dir = data_dir / "jobs"

    if csv_path and csv_path.is_file():
        with csv_path.open(encoding="utf-8-sig", newline="") as handle:
            for row in csv.DictReader(handle):
                job_id = str(row.get("job_id") or "").strip()
                if not job_id:
                    continue
                raw = _load_job_json(jobs_dir, (row.get("source_page") or "").strip(), job_id) if jobs_dir.is_dir() else None
                if not raw:
                    raw = _csv_row_to_raw(row)
                _merge_job_record(by_id, raw)
        return list(by_id.values())

    for path in _find_job_files(data_dir):
        raw = json.loads(path.read_text(encoding="utf-8"))
        _merge_job_record(by_id, raw)
    return list(by_id.values())


def _table_label_value(row: dict[str, str]) -> list[tuple[str, str]]:
    pairs: list[tuple[str, str]] = []
    if "label" in row and "value" in row:
        pairs.append((row["label"], row["value"]))
        return pairs
    for key, value in row.items():
        low = key.lower()
        if low.startswith("col_"):
            continue
        pairs.append((key, value))
    return pairs


def _extract_section_fields(sections: list[dict]) -> dict:
    selection: list[str] = []
    how_apply: list[str] = []
    salary: str | None = None
    age_limit: str | None = None
    fee: dict[str, str] = {}

    for section in sections:
        heading = (section.get("heading") or "").lower()
        for lst in section.get("lists") or []:
            if "selection" in heading:
                selection.extend(str(x) for x in lst)
            if "how to apply" in heading:
                how_apply.extend(str(x) for x in lst)

        for table in section.get("tables") or []:
            for row in table:
                for label, value in _table_label_value(row):
                    low = label.lower()
                    if "salary" in low or "stipend" in low or "emolument" in low:
                        salary = salary or value
                    if "age" in low:
                        age_limit = age_limit or value
                    if "fee" in low:
                        fee[label] = value

    return {
        "selection_process": selection[:8],
        "documents_required": how_apply[:10],
        "salary": salary,
        "age_limit": age_limit,
        "fee": fee,
    }


def _infer_category(clean: dict) -> str:
    source_page = clean.get("source_page") or ""
    if source_page in SOURCE_PAGE_CATEGORY:
        return SOURCE_PAGE_CATEGORY[source_page]

    probe = f"{clean.get('title', '')} {clean.get('board', '')} {clean.get('section', '')}".lower()
    if re.search(r"\brailway\b|\brrb\b", probe):
        return "railways"
    if re.search(r"\bbank\b|\bibps\b", probe):
        return "banking"
    if re.search(r"\bteach|faculty|professor|lecturer\b", probe):
        return "teaching"
    if re.search(r"\bpolice\b|\bconstable\b", probe):
        return "police"
    if re.search(r"\bdefence\b|\barmy\b|\bnavy\b|\bair force\b", probe):
        return "defence"
    if re.search(r"\bupsc\b", probe):
        return "upsc"
    if re.search(r"\bssc\b", probe):
        return "ssc"
    if re.search(r"\bpsu\b|ntpc|ongc|coal india|bel\b", probe):
        return "psu"
    if re.search(r"\bhealth|medical|nurse|aiims\b", probe):
        return "health"
    return "state"


def _resolve_state_codes(clean: dict) -> list[str]:
    source_page = (clean.get("source_page") or "").lower()
    if source_page in SOURCE_PAGE_STATE:
        return SOURCE_PAGE_STATE[source_page]
    return []


def _pick_official_urls(apply_links: list[dict[str, str]]) -> tuple[str | None, list[str]]:
    urls = [link["url"] for link in apply_links if link.get("url")]
    html_urls = [u for u in urls if not looks_like_notification_document(u)]
    pdf_candidates = [u for u in urls if looks_like_notification_document(u)]
    apply_url = pick_best_official_url(html_urls) or pick_best_official_url(urls)
    if apply_url and looks_like_notification_document(apply_url) and html_urls:
        apply_url = pick_best_official_url(html_urls)
    detail_stub = {"pdf_urls": pdf_candidates}
    pdf_urls = collect_official_pdf_urls(detail_stub, apply_url)
    if not apply_url and pdf_urls:
        apply_url = pdf_urls[0]
    return apply_url, pdf_urls


def _normalize_job(clean: dict) -> dict | None:
    apply_links = clean.get("apply_links") or []
    apply_url, pdf_urls = _pick_official_urls(apply_links)
    if not apply_url and not pdf_urls:
        return None

    section_fields = _extract_section_fields(clean.get("sections") or [])
    title = clean.get("title") or clean.get("post_name") or ""
    post_name = clean.get("post_name") or ""
    merged_text = " ".join(filter(None, [title, post_name, clean.get("summary", "")]))
    vacancies = resolve_vacancies(
        extract_vacancies(post_name, title=title) or extract_vacancies(title, title=title) or 0,
        title,
        merged_text,
    )

    important_dates = clean.get("important_dates") or []
    detail: dict = {
        "source": SOURCE_CODE,
        "external_id": clean.get("id"),
        "summary": clean.get("summary") or "",
        "advt_no": clean.get("advt_no") if clean.get("advt_no") not in ("–", "-", "") else None,
        "important_dates": important_dates,
        "pdf_urls": pdf_urls,
        "pdf_url": pdf_urls[0] if pdf_urls else None,
        "notification_url": apply_url,
        "selection_process": section_fields.get("selection_process") or [],
        "documents_required": section_fields.get("documents_required") or [],
        "content_sections": clean.get("sections") or [],
    }
    if section_fields.get("fee"):
        detail["fee"] = section_fields["fee"]

    normalized = {
        "title": title,
        "dept": clean.get("board") or None,
        "category": _infer_category(clean),
        "state_codes": _resolve_state_codes(clean),
        "vacancies": vacancies,
        "qualification": clean.get("qualification") or None,
        "salary": section_fields.get("salary"),
        "age_limit": section_fields.get("age_limit"),
        "last_date": clean.get("last_date") or None,
        "apply_url": apply_url,
        "pdf_urls": pdf_urls,
        "status": "live",
        "detail": detail,
    }

    validator = ValidationService()
    valid, reasons = validator.validate(normalized)
    if not valid:
        return {"_rejected": True, "_reasons": reasons, "title": title[:80]}

    digest = content_hash(
        title=normalized["title"],
        apply_url=normalized.get("apply_url"),
        last_date=str(normalized.get("last_date") or ""),
    )
    normalized["content_hash"] = digest

    last = normalized.get("last_date")
    if last and str(last) < date.today().isoformat():
        normalized["status"] = "expired"

    return normalized


async def main() -> None:
    args = _parse_args()
    if not args.source:
        print("Set RECRUITMENT_CATALOG_PATH or pass --source /path/to/catalog")
        sys.exit(1)
    data_dir = Path(args.source).resolve()
    jobs_dir = data_dir / "jobs"
    csv_path = _resolve_csv_path(data_dir, args.csv)

    if not csv_path and not jobs_dir.is_dir():
        print(f"Jobs directory not found: {jobs_dir}")
        sys.exit(1)

    raw_jobs = _load_deduped_jobs(data_dir, csv_path)
    if args.limit > 0:
        raw_jobs = raw_jobs[: args.limit]

    catalog = str(csv_path) if csv_path else str(jobs_dir)
    print(f"Catalog import: source={data_dir} catalog={catalog} unique_jobs={len(raw_jobs)}")

    persist = JobPersistService()
    sync = SourceSyncService()
    entry = {
        "code": SOURCE_CODE,
        "sourceName": "Structured recruitment import",
        "module": "file_import",
        "enabled": True,
        "category": "Latest",
    }

    saved = 0
    rejected = 0
    skipped_no_official = 0
    reject_reasons: dict[str, int] = {}

    if not args.dry_run:
        async with SessionLocal() as session:
            await sync.ensure_source(session, entry)
            await session.commit()

    pending: list[dict] = []
    for raw in raw_jobs:
        clean = sanitize_raw_job(raw)
        normalized = _normalize_job(clean)
        if not normalized:
            skipped_no_official += 1
            continue
        if normalized.get("_rejected"):
            rejected += 1
            for reason in normalized.get("_reasons") or []:
                reject_reasons[reason] = reject_reasons.get(reason, 0) + 1
            continue

        if args.dry_run:
            saved += 1
            continue

        pending.append(normalized)

    if not args.dry_run and pending:
        async with SessionLocal() as session:
            for i, normalized in enumerate(pending, start=1):
                job = await persist.upsert_normalized(session, normalized, commit=False)
                if job:
                    saved += 1
                if i % 50 == 0:
                    await session.commit()
            await session.commit()
            exported = await persist.export_live_jobs_json(session)
        print(f"Exported live-jobs.json: {exported} items")

    print(
        f"Catalog import done: parsed={len(raw_jobs)} saved={saved} "
        f"rejected={rejected} skipped_no_official={skipped_no_official}"
    )
    if reject_reasons:
        top = sorted(reject_reasons.items(), key=lambda x: -x[1])[:8]
        print("Top reject reasons:", ", ".join(f"{k}={v}" for k, v in top))


if __name__ == "__main__":
    asyncio.run(main())
