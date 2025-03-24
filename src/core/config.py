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
    SECRET_KEY: str = "dev_secret_key"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@db:5432/sheetgpt"
    
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