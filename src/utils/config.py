from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional

class Settings(BaseSettings):
    """Application settings managed through environment variables."""
    
    # API Configuration
    API_V1_PREFIX: str = "/api/v1"
    PROJECT_NAME: str = "SheetGPT"
    DEBUG: bool = False
    
    # Security
    SECRET_KEY: str = ""
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    ENCRYPTION_KEY: Optional[str] = None
    
    # Database
    DATABASE_URL: str = ""
    
    # OpenAI (kept for compatibility with other parts of the system)
    OPENAI_API_KEY: Optional[str] = None
    
    # Anthropic (primary LLM provider)
    ANTHROPIC_API_KEY: str = ""
    
    # Google Sheets
    GOOGLE_SHEETS_CREDENTIALS: Optional[str] = None
    
    # LinkedIn API
    LINKEDIN_CLIENT_ID: Optional[str] = None
    LINKEDIN_CLIENT_SECRET: Optional[str] = None
    
    class Config:
        env_file = ".env"
        case_sensitive = True

@lru_cache()
def get_settings() -> Settings:
    """Cached settings instance."""
    return Settings() 