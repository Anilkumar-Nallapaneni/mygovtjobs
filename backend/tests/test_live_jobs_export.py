from datetime import date, datetime, timezone

from app.schemas.job import JobOut
from app.utils.live_jobs_export import slim_job_for_json_export


def test_slim_job_strips_content_sections_and_truncates_summary():
    job = JobOut(
        id="1",
        slug="sample-job-abc",
        title="Sample Recruitment 2026",
        dept="Sample Board",
        detail={
            "source": "structured-import",
            "summary": "x" * 500,
            "content_sections": [{"heading": "Overview", "paragraphs": ["long body"]}],
            "pdf_urls": ["https://example.gov.in/a.pdf", "https://example.gov.in/b.pdf"],
        },
        published_at=datetime(2026, 6, 1, tzinfo=timezone.utc),
        last_date=date(2026, 6, 30),
    )
    slim = slim_job_for_json_export(job)
    assert "content_sections" not in slim["detail"]
    assert len(slim["detail"]["summary"]) <= 401
    assert slim["detail"]["source"] == "structured-import"
    assert slim["title"] == "Sample Recruitment 2026"
