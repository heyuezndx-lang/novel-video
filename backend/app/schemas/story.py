from datetime import datetime
from pydantic import BaseModel, Field


class StoryCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    interviewee_name: str = ""
    interviewee_birth_year: int | None = None
    author_name: str = ""
    dedication: str = ""
    language: str = "zh-CN"


class StoryUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=200)
    interviewee_name: str | None = None
    interviewee_birth_year: int | None = None
    author_name: str | None = None
    dedication: str | None = None
    cover_style: str | None = None
    status: str | None = None
    settings: dict | None = None


class StoryOut(BaseModel):
    id: str
    title: str
    interviewee_name: str
    interviewee_birth_year: int | None
    author_name: str
    dedication: str
    cover_style: str
    language: str
    status: str
    current_session: int
    interview_topics_covered: list
    settings: dict
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class StoryListItem(BaseModel):
    id: str
    title: str
    interviewee_name: str
    status: str
    chapter_count: int = 0
    session_count: int = 0
    updated_at: datetime

    class Config:
        from_attributes = True
