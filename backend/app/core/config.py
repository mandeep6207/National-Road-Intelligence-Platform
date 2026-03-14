"""
Application Configuration — loaded from .env
"""
from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # App
    APP_NAME: str = "National Road Intelligence Platform"
    APP_ENV: str = "development"
    APP_SECRET_KEY: str = "change-me-in-production"
    APP_DEBUG: bool = True
    APP_PORT: int = 8000
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "https://nrip.gov.in"
    ]

    # Database (PostgreSQL — kept for reference)
    DATABASE_URL: str = "postgresql+asyncpg://nrip_user:nrip_password@localhost:5432/nrip_db"
    DATABASE_URL_SYNC: str = "postgresql://nrip_user:nrip_password@localhost:5432/nrip_db"

    # MongoDB
    MONGODB_URL: str = "mongodb://localhost:27017"
    MONGODB_DB: str = "roadguardian"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"

    # JWT
    JWT_SECRET_KEY: str = "jwt-secret-change-this"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # AI
    YOLO_MODEL_PATH: str = "ai/models/pothole_detector.pt"
    CONFIDENCE_THRESHOLD: float = 0.45
    MAX_FRAME_EXTRACTION: int = 30

    # Blockchain
    BLOCKCHAIN_MODE: str = "simulation"
    POLYGON_RPC_URL: str = "https://rpc-mumbai.maticvigil.com"
    POLYGON_CHAIN_ID: int = 80001

    # Geo defaults
    DEFAULT_CITY_LAT: float = 28.6139
    DEFAULT_CITY_LNG: float = 77.2090

    # Files
    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE_MB: int = 100

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
