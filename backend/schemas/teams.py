from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class TeamCreate(BaseModel):
    name: str
    code: Optional[str] = None

class TeamUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None

class TeamResponse(BaseModel):
    id: str
    name: str
    code: Optional[str]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

