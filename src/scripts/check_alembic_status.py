import os
import sys
from pathlib import Path
import types

# Add the project root to the Python path
sys.path.append(str(Path(__file__).parent.parent.parent))

# Create a mock module to prevent circular dependency issues
mock_sports_models = types.ModuleType("sports_models")

# Temporarily modify sys.modules to prevent sports_models from being imported
sys.modules['src.models.sports_models'] = mock_sports_models

# Import alembic components
from alembic.config import Config
from alembic import command
from src.utils.config import get_settings

def check_alembic_status():
    # Get database URL from settings
    settings = get_settings()
    database_url = settings.DATABASE_URL
    
    # Override with local database URL for direct execution
    if 'db:5432' in database_url:
        database_url = database_url.replace('db:5432', 'localhost:5432')
        print(f"Using local database URL: {database_url}")
    
    # Set environment variable for database URL
    os.environ['DATABASE_URL'] = database_url
    
    # Create Alembic config
    alembic_cfg = Config('alembic.ini')
    
    try:
        # Check current revision
        print("Checking current Alembic revision...")
        command.current(alembic_cfg)
        print("Successfully retrieved current revision.")
    except Exception as e:
        print(f"Error checking Alembic status: {str(e)}")
        import traceback
        print(traceback.format_exc())

if __name__ == "__main__":
    check_alembic_status() 