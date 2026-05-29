from sqlalchemy import Column, String, Text, DateTime, JSON, Integer, Float, ForeignKey
from sqlalchemy.orm import relationship

from ..database import Base
from .novel import _uuid, _now


class Chapter(Base):
    __tablename__ = "chapters"

    id = Column(String(36), primary_key=True, default=_uuid)
    novel_id = Column(String(36), ForeignKey("novels.id", ondelete="CASCADE"), nullable=False, index=True)

    title = Column(String(200), nullable=False)
    sort_order = Column(Integer, nullable=False, default=0)
    parent_id = Column(String(36), ForeignKey("chapters.id"), nullable=True)
    status = Column(String(20), default="draft")
    content = Column(Text, default="")
    notes = Column(Text, default="")
    word_count = Column(Integer, default=0)
    chapter_number = Column(Integer, default=0)

    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)

    novel = relationship("Novel", back_populates="chapters")
    parent = relationship("Chapter", back_populates="children", remote_side="Chapter.id", foreign_keys=[parent_id])
    children = relationship("Chapter", back_populates="parent", cascade="all, delete-orphan")
    storyboards = relationship("Storyboard", back_populates="chapter", cascade="all, delete-orphan")
    history = relationship("ChapterHistory", back_populates="chapter", cascade="all, delete-orphan",
                           order_by="ChapterHistory.version_number.desc()")


class ChapterHistory(Base):
    __tablename__ = "chapter_history"

    id = Column(String(36), primary_key=True, default=_uuid)
    chapter_id = Column(String(36), ForeignKey("chapters.id", ondelete="CASCADE"), nullable=False, index=True)

    version_number = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    word_count = Column(Integer, default=0)
    message = Column(String(500), default="")

    created_at = Column(DateTime, default=_now)

    chapter = relationship("Chapter", back_populates="history")
