"""In-memory rate limiter for public API routes (dev/single-worker)."""

import time
from collections import defaultdict

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, *, max_requests: int = 120, window_seconds: int = 60):
        super().__init__(app)
        self.max_requests = max_requests
        self.window = window_seconds
        self._hits: dict[str, list[float]] = defaultdict(list)

    def _prune_stale(self, now: float) -> None:
        cutoff = now - self.window
        stale = [ip for ip, hits in self._hits.items() if not hits or hits[-1] <= cutoff]
        for ip in stale:
            del self._hits[ip]

    async def dispatch(self, request: Request, call_next):
        if not request.url.path.startswith("/api/"):
            return await call_next(request)

        ip = _client_ip(request)
        now = time.time()
        window_start = now - self.window
        hits = [t for t in self._hits[ip] if t > window_start]
        if len(hits) >= self.max_requests:
            return Response("Rate limit exceeded", status_code=429)
        hits.append(now)
        self._hits[ip] = hits
        if len(self._hits) > 5000:
            self._prune_stale(now)
        return await call_next(request)
