from sqlalchemy import Column, String, Text, DateTime, Integer, Float, ForeignKey
from sqlalchemy.orm import relationship

from ..database import Base
from .novel import _uuid, _now


class Storyboard(Base):
    __tablename__ = "storyboards"

    id = Column(String(36), primary_key=True, default=_uuid)
    chapter_id = Column(String(36), ForeignKey("chapters.id", ondelete="CASCADE"), nullable=False, index=True)

    scene_number = Column(Integer, nullable=False, default=1)
    shot_type = Column(String(30), default="medium")
    duration = Column(Float, default=5.0)
    visual_desc = Column(Text, default="")
    dialogue = Column(Text, default="")
    camera_motion = Column(String(30), default="static")
    transition = Column(String(30), default="cut")
    status = Column(String(20), default="draft")

    sort_order = Column(Integer, default=0)

    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)

    chapter = relationship("Chapter", back_populates="storyboards")
    video_tasks = relationship("VideoTask", back_populates="storyboard", cascade="all, delete-orphan")
