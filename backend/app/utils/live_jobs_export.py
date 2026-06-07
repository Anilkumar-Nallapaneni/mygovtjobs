"""Trim job rows for static live-jobs.json — list/card fields only; full detail via API/Supabase."""

from __future__ import annotations

from typing import Any

from app.schemas.job import JobOut

_SLIM_DETAIL_KEYS = frozenset(
    {
        "source",
        "summary",
        "pdf_url",
        "pdf_urls",
        "pdfUrl",
        "notification_url",
        "external_id",
    }
)
_SUMMARY_MAX = 400


def slim_job_for_json_export(job: JobOut) -> dict[str, Any]:
    """Drop heavy detail blobs (content_sections) from the static snapshot."""
    data = job.model_dump(mode="json")
    detail = data.get("detail")
    if isinstance(detail, dict):
        slim: dict[str, Any] = {}
        for key in _SLIM_DETAIL_KEYS:
            if key in detail and detail[key]:
                slim[key] = detail[key]
        summary = slim.get("summary")
        if isinstance(summary, str) and len(summary) > _SUMMARY_MAX:
            slim["summary"] = f"{summary[:_SUMMARY_MAX]}…"
        data["detail"] = slim
    return data
