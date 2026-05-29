from sqlalchemy import Column, String, Text, DateTime, Integer, ForeignKey
from sqlalchemy.orm import relationship

from ..database import Base
from .story import _uuid, _now


class Photo(Base):
    __tablename__ = "photos"

    id = Column(String(36), primary_key=True, default=_uuid)
    story_id = Column(String(36), ForeignKey("stories.id", ondelete="CASCADE"), nullable=False, index=True)
    chapter_id = Column(String(36), nullable=True)
    caption = Column(String(500), default="")
    file_path = Column(String(500), nullable=False)
    thumbnail_path = Column(String(500), default="")
    sort_order = Column(Integer, default=0)

    created_at = Column(DateTime, default=_now)

    story = relationship("Story", back_populates="photos")
