from sqlalchemy import Column, String, Text, DateTime, Integer, ForeignKey
from sqlalchemy.orm import relationship

from ..database import Base
from .story import _uuid, _now


class MemoryFragment(Base):
    __tablename__ = "memory_fragments"

    id = Column(String(36), primary_key=True, default=_uuid)
    story_id = Column(String(36), ForeignKey("stories.id", ondelete="CASCADE"), nullable=False, index=True)
    session_id = Column(String(36), nullable=True)
    question = Column(Text, default="")
    raw_answer = Column(Text, default="")
    processed_content = Column(Text, default="")
    topic = Column(String(30), default="other")
    emotional_tone = Column(String(30), default="neutral")
    is_used = Column(Integer, default=0)

    created_at = Column(DateTime, default=_now)
