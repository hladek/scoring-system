from sqlalchemy import Column, Integer, ForeignKey, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from database import Base

class Result(Base):
    """Result entity - stores scoring data for a team in a specific match"""
    __tablename__ = "results"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    match_id = Column(UUID(as_uuid=True), ForeignKey("matches.id", ondelete="CASCADE"), nullable=False)
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id", ondelete="CASCADE"), nullable=False)
    
    # Scoring breakdown
    score = Column(Integer, default=0, nullable=False)
    goals = Column(Integer, default=0)  # deprecated, kept for compatibility
    fouls = Column(Integer, default=0)  # deprecated, kept for compatibility
    tasks_completed = Column(Integer, default=0)
    precision_points = Column(Integer, default=0)
    
    # Time to complete (milliseconds)
    completion_time_milliseconds = Column(Integer, nullable=True)
    
    # additional stats
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # relationships
    match = relationship("Match", back_populates="results")
    team = relationship("Team")

