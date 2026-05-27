"""Official host allow/block behavior."""

from app.utils.official_hosts import is_blocked_aggregator_host, is_official_recruitment_host


def test_employment_news_is_official_not_aggregator():
    url = "https://employmentnews.gov.in/NewEmp/MoreContentNew.aspx?n=Recruitment"
    assert not is_blocked_aggregator_host(url)
    assert is_official_recruitment_host(url)


def test_known_aggregator_still_blocked():
    url = "https://www.sarkariresult.com/example-recruitment/"
    assert is_blocked_aggregator_host(url)
    assert not is_official_recruitment_host(url)
