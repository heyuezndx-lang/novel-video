from datetime import datetime
from pydantic import BaseModel


class VideoTaskCreate(BaseModel):
    storyboard_id: str
    provider: str = "kling"


class VideoTaskOut(BaseModel):
    id: str
    storyboard_id: str
    status: str
    provider: str
    prompt_sent: str
    result_url: str
    thumbnail_url: str
    duration: float
    error_msg: str
    created_at: datetime
    completed_at: datetime | None

    class Config:
        from_attributes = True


class VideoGenerateRequest(BaseModel):
    storyboard_ids: list[str]
    provider: str = "kling"
