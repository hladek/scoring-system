from sqlalchemy import Column, ForeignKey, Table
from sqlalchemy.dialects.postgresql import UUID
from database import Base

# Association table for many-to-many relationship between User and Team
user_teams = Table(
    'user_teams',
    Base.metadata,
    Column('user_id', UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
    Column('team_id', UUID(as_uuid=True), ForeignKey('teams.id', ondelete='CASCADE'), primary_key=True)
)









