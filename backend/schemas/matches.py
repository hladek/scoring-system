from pydantic import BaseModel
from typing import Optional, List, TYPE_CHECKING
from datetime import datetime

if TYPE_CHECKING:
    from schemas.teams import TeamResponse
    from schemas.results import ResultResponse
    from schemas.penalties import PenaltyResponse

class MatchCreate(BaseModel):
    competition_id: str
    team1_id: Optional[str] = None
    team2_id: Optional[str] = None
    team1_name: Optional[str] = None  # For quick creation without team
    team2_name: Optional[str] = None  # For quick creation without team
    match_name: Optional[str] = None
    match_date: Optional[datetime] = None
    duration_minutes: Optional[int] = 0
    round_number: Optional[int] = None
    stage: Optional[str] = None
    status: Optional[str] = "scheduled"

class MatchUpdate(BaseModel):
    team1_id: Optional[str] = None
    team2_id: Optional[str] = None
    match_name: Optional[str] = None
    match_date: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    current_time: Optional[int] = None
    round_number: Optional[int] = None
    stage: Optional[str] = None
    status: Optional[str] = None

class MatchResponse(BaseModel):
    id: str
    competition_id: str
    team1_id: Optional[str]
    team2_id: Optional[str]
    match_name: Optional[str]
    match_date: Optional[datetime]
    duration_minutes: Optional[int]
    current_time: Optional[int]
    round_number: Optional[int]
    stage: Optional[str]
    status: str
    created_at: datetime
    updated_at: datetime
    # Removed team1, team2, results, penalties to avoid circular dependencies
    # These can be loaded separately if needed
    
    class Config:
        from_attributes = True

