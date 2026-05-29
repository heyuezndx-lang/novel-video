from datetime import datetime
from pydantic import BaseModel, Field


class CharacterCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    role: str = "supporting"
    age: int | None = None
    gender: str = ""
    occupation: str = ""
    appearance: str = ""
    personality: str = ""
    background: str = ""
    goals: str = ""
    conflicts: str = ""
    arc: str = ""
    tags: list[str] = []
    sort_order: int = 0


class CharacterUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=100)
    role: str | None = None
    age: int | None = None
    gender: str | None = None
    occupation: str | None = None
    appearance: str | None = None
    personality: str | None = None
    background: str | None = None
    goals: str | None = None
    conflicts: str | None = None
    arc: str | None = None
    tags: list[str] | None = None
    relationships: dict | None = None
    sort_order: int | None = None


class CharacterOut(BaseModel):
    id: str
    novel_id: str
    name: str
    role: str
    age: int | None
    gender: str
    occupation: str
    appearance: str
    personality: str
    background: str
    goals: str
    conflicts: str
    arc: str
    tags: list
    relationships: dict
    avatar_url: str
    sort_order: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
