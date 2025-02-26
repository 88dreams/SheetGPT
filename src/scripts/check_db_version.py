import asyncio
import sys
from pathlib import Path

# Add the project root to the Python path
sys.path.append(str(Path(__file__).parent.parent.parent))

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from src.utils.config import get_settings

async def check_db_version():
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
        # Check alembic_version table
        async with engine.connect() as conn:
            # Start a transaction
            async with conn.begin():
                # Check alembic_version table
                result = await conn.execute(text("SELECT * FROM alembic_version"))
                versions = result.fetchall()
                
                if versions:
                    print("Current database versions:")
                    for version in versions:
                        print(f"  - {version[0]}")
                else:
                    print("No versions found in alembic_version table")
                    
                # Check if sports tables exist
                result = await conn.execute(text(
                    "SELECT table_name FROM information_schema.tables "
                    "WHERE table_schema = 'public'"
                ))
                tables = result.fetchall()
                
                print("\nExisting tables in database:")
                for table in tables:
                    print(f"  - {table[0]}")
    except Exception as e:
        print(f"Error checking database: {str(e)}")
        import traceback
        print(traceback.format_exc())

if __name__ == "__main__":
    asyncio.run(check_db_version()) 