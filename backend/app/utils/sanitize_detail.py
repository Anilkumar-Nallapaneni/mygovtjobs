"""Strip internal discovery fields before API/JSON export."""

from __future__ import annotations

from typing import Any

_INTERNAL_DETAIL_KEYS = frozenset(
    {"discovery_ref", "discovered_via", "discovery_source"}
)


def sanitize_job_detail(detail: dict[str, Any] | None) -> dict[str, Any]:
    if not detail:
        return {}
    out = dict(detail)
    for key in _INTERNAL_DETAIL_KEYS:
        out.pop(key, None)
    return out
