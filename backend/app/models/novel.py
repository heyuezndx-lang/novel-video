import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime, JSON, Integer, Float, ForeignKey
from sqlalchemy.orm import relationship

from ..database import Base


def _uuid():
    return str(uuid.uuid4())


def _now():
    return datetime.now(timezone.utc)


class Novel(Base):
    __tablename__ = "novels"

    id = Column(String(36), primary_key=True, default=_uuid)
    title = Column(String(200), nullable=False, index=True)
    author = Column(String(100), default="")
    description = Column(Text, default="")
    genre = Column(String(50), default="")
    language = Column(String(10), default="zh-CN")
    status = Column(String(20), default="draft")
    settings = Column(JSON, default=dict)

    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)

    characters = relationship("Character", back_populates="novel", cascade="all, delete-orphan")
    chapters = relationship("Chapter", back_populates="novel", cascade="all, delete-orphan",
                            order_by="Chapter.sort_order")
