"""Shared httpx helpers for scrapers."""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from dataclasses import dataclass
import httpx


def _headers(user_agent: str | None) -> dict[str, str]:
    ua = user_agent or "BharatNaukri/1.0 (+https://github.com/gov-job-alert)"
    return {"User-Agent": ua}


@asynccontextmanager
async def create_async_client(
    *,
    timeout: float = 30,
    user_agent: str | None = None,
) -> AsyncIterator[httpx.AsyncClient]:
    async with httpx.AsyncClient(
        timeout=timeout,
        follow_redirects=True,
        headers=_headers(user_agent),
    ) as client:
        yield client


@dataclass(frozen=True)
class TextResponse:
    text: str
    status_code: int
    url: str


async def get_text(url: str, *, user_agent: str | None = None, timeout: float = 30) -> TextResponse:
    async with create_async_client(timeout=timeout, user_agent=user_agent) as client:
        res: httpx.Response = await client.get(url)
        res.raise_for_status()
        return TextResponse(text=res.text, status_code=res.status_code, url=str(res.url))
