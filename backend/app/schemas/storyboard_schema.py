from datetime import datetime
from pydantic import BaseModel, Field


class StoryboardCreate(BaseModel):
    scene_number: int = 1
    shot_type: str = "medium"
    duration: float = 5.0
    visual_desc: str = ""
    dialogue: str = ""
    camera_motion: str = "static"
    transition: str = "cut"
    sort_order: int = 0


class StoryboardUpdate(BaseModel):
    scene_number: int | None = None
    shot_type: str | None = None
    duration: float | None = None
    visual_desc: str | None = None
    dialogue: str | None = None
    camera_motion: str | None = None
    transition: str | None = None
    status: str | None = None
    sort_order: int | None = None


class StoryboardOut(BaseModel):
    id: str
    chapter_id: str
    scene_number: int
    shot_type: str
    duration: float
    visual_desc: str
    dialogue: str
    camera_motion: str
    transition: str
    status: str
    sort_order: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class StoryboardGenerateRequest(BaseModel):
    text_snippet: str = Field(min_length=10)
    shot_count: int = Field(default=5, ge=1, le=20)
