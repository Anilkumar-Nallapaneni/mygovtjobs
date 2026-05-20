from pydantic import BaseModel, Field


class AlertSubscribeRequest(BaseModel):
    channel: str = Field(pattern="^(email|telegram|push)$")
    channel_address: str
    state_codes: list[str] = Field(default_factory=list)
    categories: list[str] = Field(default_factory=list)
    qualification_tags: list[str] = Field(default_factory=list)
