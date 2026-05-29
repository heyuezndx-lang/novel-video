from sqlalchemy import Column, String, Text, DateTime, JSON, Integer, ForeignKey
from sqlalchemy.orm import relationship

from ..database import Base
from .story import _uuid, _now


class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id = Column(String(36), primary_key=True, default=_uuid)
    story_id = Column(String(36), ForeignKey("stories.id", ondelete="CASCADE"), nullable=False, index=True)
    session_number = Column(Integer, nullable=False, default=1)
    topic = Column(String(100), default="")
    status = Column(String(20), default="in_progress")
    message_count = Column(Integer, default=0)
    summary = Column(Text, default="")
    mood_tags = Column(JSON, default=list)

    started_at = Column(DateTime, default=_now)
    completed_at = Column(DateTime, nullable=True)

    story = relationship("Story", back_populates="sessions")
    messages = relationship("InterviewMessage", back_populates="session", cascade="all, delete-orphan",
                            order_by="InterviewMessage.created_at")


class InterviewMessage(Base):
    __tablename__ = "interview_messages"

    id = Column(String(36), primary_key=True, default=_uuid)
    session_id = Column(String(36), ForeignKey("interview_sessions.id", ondelete="CASCADE"),
                        nullable=False, index=True)
    role = Column(String(10), nullable=False)
    message_type = Column(String(20), default="qa")
    content = Column(Text, nullable=False)
    related_event_id = Column(String(36), nullable=True)
    emotion = Column(String(30), default="")
    extracted_events = Column(JSON, default=list)
    detected_persons = Column(JSON, default=list)

    created_at = Column(DateTime, default=_now)

    session = relationship("InterviewSession", back_populates="messages")
