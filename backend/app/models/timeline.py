from sqlalchemy import Column, String, Text, DateTime, JSON, Integer, ForeignKey
from sqlalchemy.orm import relationship

from ..database import Base
from .story import _uuid, _now


class TimelineEvent(Base):
    __tablename__ = "timeline_events"

    id = Column(String(36), primary_key=True, default=_uuid)
    story_id = Column(String(36), ForeignKey("stories.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, default="")
    event_year = Column(Integer, nullable=True)
    event_month = Column(Integer, nullable=True)
    event_day = Column(Integer, nullable=True)
    date_precision = Column(String(20), default="year")
    category = Column(String(30), default="other")
    importance = Column(Integer, default=3)
    emotional_tone = Column(String(30), default="neutral")
    location = Column(String(200), default="")
    people_involved = Column(JSON, default=list)
    verified = Column(Integer, default=0)
    source_message_id = Column(String(36), nullable=True)

    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)

    story = relationship("Story", back_populates="timeline_events")
