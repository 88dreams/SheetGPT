from pydantic_settings import BaseSettings
from pathlib import Path

class GoogleSheetsConfig(BaseSettings):
    """Configuration settings for Google Sheets integration."""
    
    # Paths for credentials and token storage
    CREDENTIALS_PATH: str = str(Path("credentials/google_sheets_credentials.json"))
    TOKEN_PATH: str = str(Path("credentials/token.json"))
    
    # API Configuration
    BATCH_SIZE: int = 100  # Maximum number of rows to process in one batch
    MAX_RETRIES: int = 3   # Maximum number of retries for failed API calls
    TIMEOUT: int = 30      # Timeout in seconds for API calls
    
    # Template Configuration
    DEFAULT_TEMPLATE: str = "default"  # Default template name
    TEMPLATES_PATH: str = str(Path("templates/sheets"))
    
    class Config:
        env_prefix = "GOOGLE_SHEETS_"
        case_sensitive = False 