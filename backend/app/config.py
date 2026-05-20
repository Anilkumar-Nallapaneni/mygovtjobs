from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

REPO_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(str(REPO_ROOT / ".env"), str(REPO_ROOT / "backend" / ".env")),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/bharatnaukri"
    supabase_url: str | None = None
    supabase_service_role_key: str | None = None
    sql_echo: bool = False
    live_jobs_json_path: str = str(REPO_ROOT / "frontend" / "public" / "data" / "live-jobs.json")
    cors_origins: str = "http://localhost:5174,http://localhost:5175,http://127.0.0.1:5174,http://localhost:2222"
    admin_api_key: str | None = None
    app_env: str = "development"
    allow_fallback_json_export: bool = False
    rate_limit_per_minute: int = 120
    ingest_lookback_days: int = 60
    ingest_max_items_per_source: int = 120


@lru_cache
def get_settings() -> Settings:
    return Settings()
