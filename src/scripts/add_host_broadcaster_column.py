import asyncio
import os
import sys
from pathlib import Path

# Add the project root to the Python path
sys.path.append(str(Path(__file__).parent.parent.parent))

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from src.utils.config import get_settings

async def add_host_broadcaster_column():
    """Add host_broadcaster column to stadiums table."""
    settings = get_settings()
    database_url = settings.DATABASE_URL
    
    # Create async engine
    engine = create_async_engine(database_url)
    
    async with engine.begin() as conn:
        # Add the column if it doesn't exist
        await conn.execute(text("""
            DO $$ 
            BEGIN 
                IF NOT EXISTS (
                    SELECT 1 
                    FROM information_schema.columns 
                    WHERE table_name = 'stadiums' 
                    AND column_name = 'host_broadcaster'
                ) THEN 
                    ALTER TABLE stadiums 
                    ADD COLUMN host_broadcaster VARCHAR(100);
                END IF;
            END $$;
        """))
        
        # Update host_broadcaster values based on broadcast_companies table
        await conn.execute(text("""
            UPDATE stadiums s
            SET host_broadcaster = bc.name
            FROM broadcast_companies bc
            WHERE s.host_broadcaster_id = bc.id
            AND s.host_broadcaster IS NULL;
        """))
        
        print("Successfully added host_broadcaster column and updated values.")

if __name__ == "__main__":
    asyncio.run(add_host_broadcaster_column()) 