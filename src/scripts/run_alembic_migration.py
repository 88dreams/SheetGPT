import os
import sys
from pathlib import Path

# Add the project root to the Python path
sys.path.append(str(Path(__file__).parent.parent.parent))

# Temporarily modify sys.modules to prevent sports_models from being imported
sys.modules['src.models.sports_models'] = type('MockModule', (), {
    'League': None,
    'Stadium': None,
    'Team': None,
    'Player': None,
    'Game': None,
    'BroadcastCompany': None,
    'BroadcastRights': None,
    'ProductionCompany': None,
    'ProductionService': None,
    'Brand': None,
    'BrandRelationship': None,
    'TeamRecord': None,
    'TeamOwnership': None,
    'LeagueExecutive': None,
    'GameBroadcast': None
})

# Import alembic components
from alembic.config import Config
from alembic import command
from src.utils.config import get_settings

def run_migration():
    # Get database URL from settings
    settings = get_settings()
    database_url = settings.DATABASE_URL
    
    # Override with local database URL if needed
    if 'db:5432' in database_url:
        database_url = database_url.replace('db:5432', 'localhost:5432')
        print(f"Using local database URL: {database_url}")
    
    # Set environment variable for database URL
    os.environ['DATABASE_URL'] = database_url
    
    # Create Alembic config
    alembic_cfg = Config('alembic.ini')
    
    # Run the migration
    print("Running Alembic migration...")
    command.upgrade(alembic_cfg, 'f626a8bff0f1')
    print("Migration completed successfully!")

if __name__ == "__main__":
    run_migration() 