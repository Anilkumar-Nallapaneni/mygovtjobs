from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.middleware.rate_limit import RateLimitMiddleware
from app.routes import admin, alerts, health, ingest, jobs, meta

load_dotenv()

_settings = get_settings()

app = FastAPI(
    title="BharatNaukri API",
    description="Government job listings, ingestion, and alerts",
    version="0.2.0",
)

_origins = [o.strip() for o in _settings.cors_origins.split(",") if o.strip()]
if not _origins:
    _origins = (
        ["http://localhost:2222", "http://127.0.0.1:2222"]
        if _settings.app_env != "production"
        else []
    )
if not _origins and _settings.app_env == "production":
    raise RuntimeError("CORS_ORIGINS must be set in production")
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RateLimitMiddleware, max_requests=_settings.rate_limit_per_minute)

app.include_router(health.router, tags=["health"])
app.include_router(jobs.router, prefix="/api/jobs", tags=["jobs"])
app.include_router(jobs.router, prefix="/api/search", tags=["search"])
app.include_router(meta.router, prefix="/api/meta", tags=["meta"])
app.include_router(ingest.router, prefix="/api/ingest", tags=["ingest"])
app.include_router(alerts.router, prefix="/api/alerts", tags=["alerts"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])


@app.get("/")
def root():
    return {"service": "bharatnaukri-api", "docs": "/docs", "version": "0.2.0"}
