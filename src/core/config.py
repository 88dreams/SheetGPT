import os
import logging
from typing import Optional, List
from functools import lru_cache

# Setup basic logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("config")

# Environment setting - hardcoded for reliability
ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()
logger.info(f"Environment: {ENVIRONMENT}")

# Extremely simple settings class - no Pydantic
class Settings:
    """Simple settings class without Pydantic to avoid validation issues."""
    
    # Environment
    ENVIRONMENT: str = ENVIRONMENT
    
    # API Configuration
    API_V1_PREFIX: str = "/api/v1"
    PROJECT_NAME: str = "SheetGPT"
    DEBUG: bool = ENVIRONMENT != "production"
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev_secret_key")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15 if ENVIRONMENT == "production" else 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30 if ENVIRONMENT == "production" else 7
    
    # Cookie settings
    COOKIE_SECURE: bool = ENVIRONMENT == "production"
    COOKIE_HTTPONLY: bool = True
    COOKIE_SAMESITE: str = "strict" if ENVIRONMENT == "production" else "lax"
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@db:5432/sheetgpt")
    DATABASE_POOL_SIZE: int = 20 if ENVIRONMENT == "production" else 5
    DATABASE_MAX_OVERFLOW: int = 10 if ENVIRONMENT == "production" else 2
    DATABASE_POOL_TIMEOUT: int = 30 if ENVIRONMENT == "production" else 15
    
    # CORS settings - allow frontend domain and local development
    CORS_ORIGINS: List[str] = [
        "https://www.88gpts.com",   # Production frontend domain
        "https://88gpts.com",       # Without www
        "https://api.88gpts.com"    # API subdomain
    ] if ENVIRONMENT == "production" else [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000", 
        "http://127.0.0.1:3000"
    ]
    
    # Logging
    LOG_LEVEL: str = "WARNING" if ENVIRONMENT == "production" else "DEBUG"
    
    # API keys - get directly from environment
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY")
    ANTHROPIC_API_KEY: Optional[str] = os.getenv("ANTHROPIC_API_KEY")
    
    # Google Sheets
    GOOGLE_SHEETS_CREDENTIALS: Optional[str] = os.getenv("GOOGLE_SHEETS_CREDENTIALS")
    
    def __init__(self):
        """Log key settings on initialization."""
        logger.info(f"Initialized settings for environment: {self.ENVIRONMENT}")
        logger.info(f"CORS Origins: {self.CORS_ORIGINS}")
        logger.info(f"Database URL: {self.DATABASE_URL.split('@')[1] if '@' in self.DATABASE_URL else 'default'}")
        logger.info(f"Debug mode: {self.DEBUG}")

@lru_cache()
def get_settings() -> Settings:
    """Cached settings instance."""
    return Settings()

# Create settings instance
settings = get_settings()