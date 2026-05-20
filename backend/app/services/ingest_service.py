from app.agents.ingest_agent import IngestAgent


class IngestService:
    def __init__(self):
        self.agent = IngestAgent()

    async def run_source(self, source_code: str) -> dict:
        return await self.agent.run_source(source_code)

    async def run_all_enabled(self) -> list[dict]:
        return await self.agent.run_all_enabled()
