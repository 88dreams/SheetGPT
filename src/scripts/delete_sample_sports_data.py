#!/usr/bin/env python
import asyncio
import sys
from pathlib import Path

# Add the project root to the Python path
sys.path.append(str(Path(__file__).parent.parent.parent))

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from src.utils.config import get_settings

async def delete_sample_data():
    """Delete all sample data from the sports database."""
    # Get database URL from settings
    settings = get_settings()
    database_url = settings.DATABASE_URL
    
    # Override with local database URL for direct execution
    if 'db:5432' in database_url:
        print(f"Using database URL with Docker container: {database_url}")
    else:
        database_url = database_url.replace('localhost:5432', 'db:5432')
        print(f"Using database URL: {database_url}")
    
    # Create async engine
    engine = create_async_engine(database_url)
    
    try:
        async with engine.begin() as conn:
            # Delete in reverse order of dependencies
            print("Deleting sample data...")
            
            # Delete brand relationships first
            await conn.execute(text("DELETE FROM brand_relationships"))
            print("Deleted brand relationships.")
            
            # Delete game broadcasts
            await conn.execute(text("DELETE FROM game_broadcasts"))
            print("Deleted game broadcasts.")
            
            # Delete games
            await conn.execute(text("DELETE FROM games"))
            print("Deleted games.")
            
            # Delete players
            await conn.execute(text("DELETE FROM players"))
            print("Deleted players.")
            
            # Delete production services
            await conn.execute(text("DELETE FROM production_services"))
            print("Deleted production services.")
            
            # Delete broadcast rights
            await conn.execute(text("DELETE FROM broadcast_rights"))
            print("Deleted broadcast rights.")
            
            # Delete teams
            await conn.execute(text("DELETE FROM teams"))
            print("Deleted teams.")
            
            # Delete stadiums
            await conn.execute(text("DELETE FROM stadiums"))
            print("Deleted stadiums.")
            
            # Delete production companies
            await conn.execute(text("DELETE FROM production_companies"))
            print("Deleted production companies.")
            
            # Delete broadcast companies
            await conn.execute(text("DELETE FROM broadcast_companies"))
            print("Deleted broadcast companies.")
            
            # Delete brands
            await conn.execute(text("DELETE FROM brands"))
            print("Deleted brands.")
            
            # Delete leagues last
            await conn.execute(text("DELETE FROM leagues"))
            print("Deleted leagues.")
            
            print("All sample data deleted successfully!")
            
    except Exception as e:
        print(f"Error deleting sample data: {str(e)}")
        import traceback
        print(traceback.format_exc())

if __name__ == "__main__":
    asyncio.run(delete_sample_data()) 