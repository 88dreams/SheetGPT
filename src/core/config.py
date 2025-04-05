import os
import json
from typing import Optional, List, Any, Dict
from functools import lru_cache
from pydantic_settings import BaseSettings
from pydantic import field_validator

# Environment setting
ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()

def get_cors_origins() -> List[str]:
    """
    Parse CORS_ORIGINS environment variable.
    Accepts comma-separated string or JSON array.
    """
    cors_env = os.getenv("CORS_ORIGINS")
    if not cors_env:
        # Default values based on environment
        return [
            "https://www.88gpts.com",  # Production default
        ] if ENVIRONMENT == "production" else [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000", 
            "http://127.0.0.1:3000"
        ]
    
    # Try to parse as JSON
    try:
        origins = json.loads(cors_env)
        if isinstance(origins, list):
            return origins
        # If it's a string in JSON, convert to list
        if isinstance(origins, str):
            return [origin.strip() for origin in origins.split(",")]
        return []
    except json.JSONDecodeError:
        # If not JSON, treat as comma-separated string
        return [origin.strip() for origin in cors_env.split(",")]


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
    
    # CORS settings - load from environment or use defaults
    CORS_ORIGINS: List[str] = get_cors_origins()
    
    # Logging
    LOG_LEVEL: str = "WARNING" if ENVIRONMENT == "production" else "DEBUG"
    
    # OpenAI (kept for compatibility with other parts of the system)
    OPENAI_API_KEY: Optional[str] = None
    
    # Anthropic (primary LLM provider)
    ANTHROPIC_API_KEY: Optional[str] = None
    
    # Google Sheets
    GOOGLE_SHEETS_CREDENTIALS: Optional[str] = None
    
    # Custom validator for CORS_ORIGINS
    @field_validator('CORS_ORIGINS', mode='before')
    @classmethod
    def validate_cors_origins(cls, v: Any) -> List[str]:
        if isinstance(v, str):
            try:
                # Try parsing as JSON
                origins = json.loads(v)
                if isinstance(origins, list):
                    return origins
                # If it's a string in JSON, convert to list
                if isinstance(origins, str):
                    return [origin.strip() for origin in origins.split(",")]
            except json.JSONDecodeError:
                # If not JSON, treat as comma-separated string
                return [origin.strip() for origin in v.split(",")]
        # If already a list or other type, return as is
        return v
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"  # Ignore extra fields in environment variables

@lru_cache()
def get_settings() -> Settings:
    """Cached settings instance."""
    return Settings()

settings = get_settings()