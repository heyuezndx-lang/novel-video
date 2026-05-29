import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime, JSON, Integer, ForeignKey
from sqlalchemy.orm import relationship

from ..database import Base


def _uuid():
    return str(uuid.uuid4())


def _now():
    return datetime.now(timezone.utc)


class Story(Base):
    __tablename__ = "stories"

    id = Column(String(36), primary_key=True, default=_uuid)
    title = Column(String(200), nullable=False, index=True)
    interviewee_name = Column(String(100), default="")
    interviewee_birth_year = Column(Integer, nullable=True)
    author_name = Column(String(100), default="")
    dedication = Column(Text, default="")
    cover_style = Column(String(50), default="classic")
    language = Column(String(10), default="zh-CN")
    status = Column(String(20), default="draft")
    current_session = Column(Integer, default=0)
    interview_topics_covered = Column(JSON, default=list)
    settings = Column(JSON, default=dict)

    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)

    sessions = relationship("InterviewSession", back_populates="story", cascade="all, delete-orphan",
                            order_by="InterviewSession.session_number")
    timeline_events = relationship("TimelineEvent", back_populates="story", cascade="all, delete-orphan",
                                   order_by="TimelineEvent.event_year")
    persons = relationship("Person", back_populates="story", cascade="all, delete-orphan")
    chapters = relationship("Chapter", back_populates="story", cascade="all, delete-orphan",
                            order_by="Chapter.sort_order")
    photos = relationship("Photo", back_populates="story", cascade="all, delete-orphan")
