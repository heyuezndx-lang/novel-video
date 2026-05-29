from datetime import datetime
from pydantic import BaseModel, Field


class PersonCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    relationship: str = ""
    birth_year: int | None = None
    description: str = ""
    first_met_story: str = ""
    importance: int = 3
    tags: list[str] = []
    photo_url: str = ""


class PersonUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=100)
    relationship: str | None = None
    birth_year: int | None = None
    description: str | None = None
    first_met_story: str | None = None
    importance: int | None = None
    tags: list[str] | None = None
    photo_url: str | None = None


class PersonOut(BaseModel):
    id: str
    story_id: str
    name: str
    relationship: str
    photo_url: str
    birth_year: int | None
    description: str
    first_met_story: str
    importance: int
    tags: list
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
