from sqlalchemy import Column, String, DateTime, Integer, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
import enum
from database import Base

class MatchStatus(str, enum.Enum):
    SCHEDULED = "scheduled"
    LIVE = "live"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    PAUSED = "paused"

class Match(Base):
    """Match entity - represents a match between teams (or solo run if team2 is null)"""
    __tablename__ = "matches"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    competition_id = Column(UUID(as_uuid=True), ForeignKey("competitions.id", ondelete="CASCADE"), nullable=False)
    team1_id = Column(UUID(as_uuid=True), ForeignKey("teams.id", ondelete="SET NULL"), nullable=True)
    team2_id = Column(UUID(as_uuid=True), ForeignKey("teams.id", ondelete="SET NULL"), nullable=True)  # null for solo runs
    
    # match details
    match_name = Column(String(200), nullable=True)
    match_date = Column(DateTime, nullable=True)
    duration_minutes = Column(Integer, default=0)
    current_time = Column(Integer, default=0)  # timer in seconds
    
    status = Column(String(20), default=MatchStatus.SCHEDULED.value, nullable=False)
    
    # Tournament structure
    round_number = Column(Integer, nullable=True)
    stage = Column(String(50), nullable=True)  # Quarterfinal, Semifinal, Final, etc.
    
    # Completion time for solo runs (milliseconds)
    completion_time_milliseconds = Column(Integer, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # relationships
    competition = relationship("Competition", back_populates="matches")
    team1 = relationship("Team", foreign_keys=[team1_id])
    team2 = relationship("Team", foreign_keys=[team2_id])
    results = relationship("Result", back_populates="match", cascade="all, delete-orphan")
    penalties = relationship("Penalty", back_populates="match", cascade="all, delete-orphan")

