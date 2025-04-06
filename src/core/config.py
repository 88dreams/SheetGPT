import os
import json
from typing import Optional, List, Any, Dict
from functools import lru_cache
from pydantic_settings import BaseSettings

# Environment setting
ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()

# Parse CORS_ORIGINS from environment directly, don't rely on Pydantic parsing
def parse_cors_origins() -> List[str]:
    """
    Parse CORS_ORIGINS environment variable with multiple fallbacks.
    """
    cors_env = os.getenv("CORS_ORIGINS", "")
    
    # If empty, use defaults based on environment
    if not cors_env:
        return [
            "https://www.88gpts.com",  # Production default
        ] if ENVIRONMENT == "production" else [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000", 
            "http://127.0.0.1:3000"
        ]
    
    # If comma-separated string, split it
    if "," in cors_env:
        return [origin.strip() for origin in cors_env.split(",")]
    
    # If it's a single URL (no commas), return as single-item list
    return [cors_env.strip()]

# Parse CORS_ORIGINS once at module import time
CORS_ORIGINS = parse_cors_origins()

# Log the origins for debugging
print(f"CORS Origins: {CORS_ORIGINS}")

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
    
    # CORS settings - use pre-parsed value to avoid Pydantic validation issues
    CORS_ORIGINS: List[str] = CORS_ORIGINS
    
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
        extra = "ignore"  # Ignore extra fields in environment variables
        # Disable JSON validation for environment variables
        validate_assignment = False

@lru_cache()
def get_settings() -> Settings:
    """Cached settings instance."""
    return Settings()

settings = get_settings()