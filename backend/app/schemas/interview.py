from datetime import datetime
from pydantic import BaseModel, Field


class SessionStartRequest(BaseModel):
    topic: str = ""


class SendMessageRequest(BaseModel):
    content: str = Field(min_length=1)


class SessionOut(BaseModel):
    id: str
    story_id: str
    session_number: int
    topic: str
    status: str
    message_count: int
    summary: str
    mood_tags: list
    started_at: datetime
    completed_at: datetime | None

    class Config:
        from_attributes = True


class MessageOut(BaseModel):
    id: str
    session_id: str
    role: str
    message_type: str
    content: str
    emotion: str
    extracted_events: list
    detected_persons: list
    created_at: datetime

    class Config:
        from_attributes = True


class SessionWithMessages(SessionOut):
    messages: list[MessageOut] = []
