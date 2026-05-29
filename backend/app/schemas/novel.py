from datetime import datetime
from pydantic import BaseModel, Field


class NovelCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    author: str = ""
    description: str = ""
    genre: str = ""
    language: str = "zh-CN"


class NovelUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=200)
    author: str | None = None
    description: str | None = None
    genre: str | None = None
    language: str | None = None
    status: str | None = None
    settings: dict | None = None


class NovelOut(BaseModel):
    id: str
    title: str
    author: str
    description: str
    genre: str
    language: str
    status: str
    settings: dict
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class NovelListItem(BaseModel):
    id: str
    title: str
    genre: str
    status: str
    chapter_count: int = 0
    total_words: int = 0
    updated_at: datetime

    class Config:
        from_attributes = True
