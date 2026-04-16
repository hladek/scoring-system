from sqlalchemy import Column, String, Integer, ForeignKey, DateTime, Text, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
import enum
from database import Base

class PenaltyType(str, enum.Enum):
    YELLOW_CARD = "yellow_card"
    RED_CARD = "red_card"
    TECHNICAL_FOUL = "technical_foul"
    TIME_PENALTY = "time_penalty"
    POINT_DEDUCTION = "point_deduction"
    DISQUALIFICATION = "disqualification"
    OTHER = "other"

class Penalty(Base):
    """Penalty entity - tracks violations and deductions during matches"""
    __tablename__ = "penalties"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    match_id = Column(UUID(as_uuid=True), ForeignKey("matches.id", ondelete="CASCADE"), nullable=False)
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id", ondelete="SET NULL"), nullable=True)
    
    penalty_type = Column(String(50), nullable=False)
    points = Column(Integer, default=0)  # points deducted
    description = Column(Text, nullable=True)
    time_occurred = Column(Integer, nullable=True)  # match time in seconds
    issued_by = Column(String(100), nullable=True)  # judge name
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # relationships
    match = relationship("Match", back_populates="penalties")
    team = relationship("Team")

