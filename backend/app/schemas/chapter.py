from datetime import datetime
from pydantic import BaseModel, Field


class ChapterCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    parent_id: str | None = None
    sort_order: int = 0
    notes: str = ""


class ChapterUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=200)
    content: str | None = None
    notes: str | None = None
    status: str | None = None
    sort_order: int | None = None
    parent_id: str | None = None


class ChapterMove(BaseModel):
    new_sort_order: int
    new_parent_id: str | None = None


class ChapterOut(BaseModel):
    id: str
    novel_id: str
    title: str
    sort_order: int
    parent_id: str | None
    status: str
    content: str
    notes: str
    word_count: int
    chapter_number: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ChapterListItem(BaseModel):
    id: str
    title: str
    sort_order: int
    parent_id: str | None
    status: str
    word_count: int
    chapter_number: int
    updated_at: datetime
    children: list["ChapterListItem"] = []

    class Config:
        from_attributes = True


class HistoryOut(BaseModel):
    id: str
    chapter_id: str
    version_number: int
    content: str
    word_count: int
    message: str
    created_at: datetime

    class Config:
        from_attributes = True


class HistoryCreate(BaseModel):
    message: str = ""
