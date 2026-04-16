from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from pydantic_settings import BaseSettings
import os

class DatabaseSettings(BaseSettings):
    """Database configuration - loads from .env if present"""
    database_url: str = "postgresql://postgres:postgres@localhost:5432/postgres"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

db_settings = DatabaseSettings()

# SQLAlchemy engine with connection pooling
engine = create_engine(
    db_settings.database_url,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

