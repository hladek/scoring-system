from sqlalchemy import Column, Integer, ForeignKey, DateTime, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from database import Base

class Timer(Base):
    __tablename__ = "timers"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    match_id = Column(UUID(as_uuid=True), ForeignKey("matches.id", ondelete="CASCADE"), unique=True, nullable=False)
    
    # Timer state
    start_time = Column(DateTime, nullable=True)  # When timer was started
    paused_time = Column(DateTime, nullable=True)  # When timer was paused
    elapsed_seconds = Column(Integer, default=0)  # Total elapsed time in seconds
    is_running = Column(Boolean, default=False)
    is_paused = Column(Boolean, default=False)
    
    # Match duration settings
    duration_seconds = Column(Integer, default=0)  # Total match duration
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    match = relationship("Match", uselist=False)

