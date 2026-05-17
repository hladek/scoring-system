from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from database import Base

class SplitTime(Base):
    """Intermediate time recorded during a live match for a team"""
    __tablename__ = "split_times"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    match_id = Column(UUID(as_uuid=True), ForeignKey("matches.id", ondelete="CASCADE"), nullable=False)
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id", ondelete="CASCADE"), nullable=True)

    time_seconds = Column(Integer, nullable=False)   # timer value at the moment of recording
    label = Column(String(100), nullable=True)        # optional label (e.g. "Checkpoint 1")

    created_at = Column(DateTime, default=datetime.utcnow)

    match = relationship("Match")
    team = relationship("Team")
