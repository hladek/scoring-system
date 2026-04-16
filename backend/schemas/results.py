from pydantic import BaseModel
from typing import Optional, TYPE_CHECKING
from datetime import datetime

if TYPE_CHECKING:
    from schemas.teams import TeamResponse

class ResultCreate(BaseModel):
    match_id: str
    team_id: str
    score: int = 0
    goals: int = 0
    fouls: int = 0
    notes: Optional[str] = None

class ResultUpdate(BaseModel):
    score: Optional[int] = None
    goals: Optional[int] = None
    fouls: Optional[int] = None
    notes: Optional[str] = None

class ResultResponse(BaseModel):
    id: str
    match_id: str
    team_id: str
    score: int
    goals: int
    fouls: int
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime
    # Removed team to avoid circular dependencies
    
    class Config:
        from_attributes = True

