"""Simple in-memory rate limiter for public API routes."""

import time
from collections import defaultdict

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, *, max_requests: int = 120, window_seconds: int = 60):
        super().__init__(app)
        self.max_requests = max_requests
        self.window = window_seconds
        self._hits: dict[str, list[float]] = defaultdict(list)

    async def dispatch(self, request: Request, call_next):
        if not request.url.path.startswith("/api/"):
            return await call_next(request)

        ip = request.client.host if request.client else "unknown"
        now = time.time()
        window_start = now - self.window
        hits = [t for t in self._hits[ip] if t > window_start]
        if len(hits) >= self.max_requests:
            return Response("Rate limit exceeded", status_code=429)
        hits.append(now)
        self._hits[ip] = hits
        return await call_next(request)
