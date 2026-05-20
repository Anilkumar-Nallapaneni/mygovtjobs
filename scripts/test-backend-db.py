"""Test backend DATABASE_URL. Run: backend/.venv/Scripts/python scripts/test-backend-db.py"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.config import get_settings


async def main() -> None:
    url = get_settings().database_url
    if "REPLACE_WITH" in url:
        print("[FAIL] backend/.env still has REPLACE_WITH_DB_PASSWORD - set Supabase database password")
        sys.exit(1)
    engine = create_async_engine(url)
    try:
        async with engine.connect() as conn:
            n = (await conn.execute(text("SELECT count(*) FROM jobs"))).scalar_one()
        print(f"[OK] Database connected - jobs table has {n} row(s)")
    except Exception as exc:
        msg = str(exc).split("\n")[0]
        if "does not exist" in msg.lower() or "undefinedtable" in msg.lower():
            print("[FAIL] Table jobs missing - run database/supabase_setup.sql in Supabase SQL Editor")
        elif "password authentication failed" in msg.lower():
            print("[FAIL] Wrong database password in DATABASE_URL")
        else:
            print(f"[FAIL] {msg}")
        sys.exit(1)
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
