from datetime import datetime
from pydantic import BaseModel, Field


class TimelineEventCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str = ""
    event_year: int | None = None
    event_month: int | None = None
    event_day: int | None = None
    date_precision: str = "year"
    category: str = "other"
    importance: int = 3
    emotional_tone: str = "neutral"
    location: str = ""


class TimelineEventUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=200)
    description: str | None = None
    event_year: int | None = None
    event_month: int | None = None
    event_day: int | None = None
    date_precision: str | None = None
    category: str | None = None
    importance: int | None = None
    emotional_tone: str | None = None
    location: str | None = None
    verified: int | None = None


class TimelineEventOut(BaseModel):
    id: str
    story_id: str
    title: str
    description: str
    event_year: int | None
    event_month: int | None
    event_day: int | None
    date_precision: str
    category: str
    importance: int
    emotional_tone: str
    location: str
    people_involved: list
    verified: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
