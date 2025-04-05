import os
from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional, List

# Environment setting
ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()

class Settings(BaseSettings):
    """Application settings managed through environment variables."""
    
    # Environment
    ENVIRONMENT: str = ENVIRONMENT
    
    # API Configuration
    API_V1_PREFIX: str = "/api/v1"
    PROJECT_NAME: str = "SheetGPT"
    DEBUG: bool = ENVIRONMENT != "production"
    
    # Security
    SECRET_KEY: str = "dev_secret_key"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15 if ENVIRONMENT == "production" else 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30 if ENVIRONMENT == "production" else 7
    
    # Cookie settings
    COOKIE_SECURE: bool = ENVIRONMENT == "production"
    COOKIE_HTTPONLY: bool = True
    COOKIE_SAMESITE: str = "strict" if ENVIRONMENT == "production" else "lax"
    
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@db:5432/sheetgpt"
    DATABASE_POOL_SIZE: int = 20 if ENVIRONMENT == "production" else 5
    DATABASE_MAX_OVERFLOW: int = 10 if ENVIRONMENT == "production" else 2
    DATABASE_POOL_TIMEOUT: int = 30 if ENVIRONMENT == "production" else 15
    
    # CORS settings
    CORS_ORIGINS: List[str] = [
        "https://yourdomain.com",  # Replace with your production domain
    ] if ENVIRONMENT == "production" else [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    
    # Logging
    LOG_LEVEL: str = "WARNING" if ENVIRONMENT == "production" else "DEBUG"
    
    # OpenAI (kept for compatibility with other parts of the system)
    OPENAI_API_KEY: Optional[str] = None
    
    # Anthropic (primary LLM provider)
    ANTHROPIC_API_KEY: Optional[str] = None
    
    # Google Sheets
    GOOGLE_SHEETS_CREDENTIALS: Optional[str] = None
    
    class Config:
        env_file = ".env"
        case_sensitive = True

@lru_cache()
def get_settings() -> Settings:
    """Cached settings instance."""
    return Settings()

settings = get_settings()