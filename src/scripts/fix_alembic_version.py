import asyncio
import sys
from pathlib import Path

# Add the project root to the Python path
sys.path.append(str(Path(__file__).parent.parent.parent))

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from src.utils.config import get_settings

async def fix_alembic_version():
    # Get database URL from settings
    settings = get_settings()
    database_url = settings.DATABASE_URL
    
    # Override with local database URL for direct execution
    if 'db:5432' in database_url:
        database_url = database_url.replace('db:5432', 'localhost:5432')
        print(f"Using local database URL: {database_url}")
    
    # Create async engine
    engine = create_async_engine(database_url)
    
    try:
        # Check and update alembic_version table
        async with engine.connect() as conn:
            # Start a transaction
            async with conn.begin():
                # Check current version
                result = await conn.execute(text("SELECT * FROM alembic_version"))
                versions = result.fetchall()
                
                if versions:
                    print("Current database version:")
                    for version in versions:
                        print(f"  - {version[0]}")
                else:
                    print("No versions found in alembic_version table")
                
                # Ask for confirmation before updating
                print("\nThis script will update the alembic_version table to match your local scripts.")
                print("The new version will be: f626a8bff0f1 (Add sports database models)")
                confirm = input("Do you want to proceed? (y/n): ")
                
                if confirm.lower() != 'y':
                    print("Operation cancelled.")
                    return
                
                # Update the version
                await conn.execute(text("DELETE FROM alembic_version"))
                await conn.execute(text("INSERT INTO alembic_version (version_num) VALUES ('f626a8bff0f1')"))
                print("Alembic version updated successfully!")
                
                # Verify the update
                result = await conn.execute(text("SELECT * FROM alembic_version"))
                versions = result.fetchall()
                
                print("New database version:")
                for version in versions:
                    print(f"  - {version[0]}")
    except Exception as e:
        print(f"Error updating database: {str(e)}")
        import traceback
        print(traceback.format_exc())

if __name__ == "__main__":
    asyncio.run(fix_alembic_version()) 