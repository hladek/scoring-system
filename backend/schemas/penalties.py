from pydantic import BaseModel
from typing import Optional, TYPE_CHECKING
from datetime import datetime

if TYPE_CHECKING:
    from schemas.teams import TeamResponse

class PenaltyCreate(BaseModel):
    match_id: str
    team_id: Optional[str] = None
    penalty_type: str
    points: int = 0
    description: Optional[str] = None
    time_occurred: Optional[int] = None
    issued_by: Optional[str] = None

class PenaltyUpdate(BaseModel):
    penalty_type: Optional[str] = None
    points: Optional[int] = None
    description: Optional[str] = None
    time_occurred: Optional[int] = None
    issued_by: Optional[str] = None

class PenaltyResponse(BaseModel):
    id: str
    match_id: str
    team_id: Optional[str]
    penalty_type: str
    points: int
    description: Optional[str]
    time_occurred: Optional[int]
    issued_by: Optional[str]
    created_at: datetime
    # Removed team to avoid circular dependencies
    
    class Config:
        from_attributes = True

