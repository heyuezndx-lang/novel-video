from sqlalchemy import Column, String, Text, DateTime, JSON, Integer, ForeignKey
from sqlalchemy.orm import relationship as orm_rel

from ..database import Base
from .story import _uuid, _now


class Person(Base):
    __tablename__ = "persons"

    id = Column(String(36), primary_key=True, default=_uuid)
    story_id = Column(String(36), ForeignKey("stories.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    relationship = Column(String(50), default="")
    photo_url = Column(String(500), default="")
    birth_year = Column(Integer, nullable=True)
    description = Column(Text, default="")
    first_met_story = Column(Text, default="")
    importance = Column(Integer, default=3)
    tags = Column(JSON, default=list)

    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)

    story = orm_rel("Story", back_populates="persons")
