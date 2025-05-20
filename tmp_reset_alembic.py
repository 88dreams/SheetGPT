import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
import asyncio

async def reset_alembic_version():
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        print("Error: DATABASE_URL not set. Make sure it's available to the script.")
        # Attempt to import get_settings as a fallback, similar to alembic_wrapper
        try:
            from src.utils.config import get_settings
            settings = get_settings()
            db_url = settings.DATABASE_URL
            print("DATABASE_URL not in env, fetched from get_settings()")
        except ImportError:
            print("Failed to import get_settings from src.utils.config")
            exit(1)
        except Exception as e:
            print(f"Error fetching DATABASE_URL via get_settings: {e}")
            exit(1)

    if not db_url:
        print("Error: DATABASE_URL could not be determined.")
        exit(1)
        
    print(f"Attempting to clear alembic_version table using database URL: {db_url}")
    
    engine = create_async_engine(db_url)
    
    try:
        async with engine.connect() as conn:
            await conn.execute(text("DELETE FROM alembic_version;"))
            await conn.commit()
            print("Successfully cleared the alembic_version table.")
    except Exception as e:
        print(f"Error during database operation: {e}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    # Add the project root to sys.path to allow finding src.utils.config
    import sys
    from pathlib import Path
    sys.path.append(str(Path(__file__).parent.parent)) # Assuming tmp_reset_alembic.py is in /workspace (project root)
    
    asyncio.run(reset_alembic_version()) 