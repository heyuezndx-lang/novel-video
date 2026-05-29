from sqlalchemy import Column, String, Text, DateTime, Float, ForeignKey
from sqlalchemy.orm import relationship

from ..database import Base
from .novel import _uuid, _now


class VideoTask(Base):
    __tablename__ = "video_tasks"

    id = Column(String(36), primary_key=True, default=_uuid)
    storyboard_id = Column(String(36), ForeignKey("storyboards.id", ondelete="CASCADE"), nullable=False, index=True)

    status = Column(String(20), default="pending")
    provider = Column(String(30), default="kling")
    prompt_sent = Column(Text, default="")
    result_url = Column(String(500), default="")
    thumbnail_url = Column(String(500), default="")
    duration = Column(Float, default=0.0)
    error_msg = Column(Text, default="")

    created_at = Column(DateTime, default=_now)
    completed_at = Column(DateTime, nullable=True)

    storyboard = relationship("Storyboard", back_populates="video_tasks")
