from sqlalchemy import Column, String, Text, DateTime, JSON, Integer, ForeignKey
from sqlalchemy.orm import relationship

from ..database import Base
from .novel import _uuid, _now


class Character(Base):
    __tablename__ = "characters"

    id = Column(String(36), primary_key=True, default=_uuid)
    novel_id = Column(String(36), ForeignKey("novels.id", ondelete="CASCADE"), nullable=False, index=True)

    name = Column(String(100), nullable=False)
    role = Column(String(30), default="supporting")
    age = Column(Integer, nullable=True)
    gender = Column(String(20), default="")
    occupation = Column(String(100), default="")
    appearance = Column(Text, default="")
    personality = Column(Text, default="")
    background = Column(Text, default="")
    goals = Column(Text, default="")
    conflicts = Column(Text, default="")
    arc = Column(Text, default="")
    tags = Column(JSON, default=list)
    relationships = Column(JSON, default=dict)
    avatar_url = Column(String(500), default="")
    sort_order = Column(Integer, default=0)

    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)

    novel = relationship("Novel", back_populates="characters")
