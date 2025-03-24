"""
Script to add a unique constraint to broadcast_rights
"""
import sys
import os
sys.path.append(os.getcwd())  # Add current dir to path

from sqlalchemy import create_engine, text
from src.core.config import settings
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

async def add_constraint():
    # Create engine and session
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        try:
            # First verify no duplicates
            result = await session.execute(text("""
                SELECT COUNT(*) FROM (
                    SELECT entity_type, entity_id, broadcast_company_id, division_conference_id
                    FROM broadcast_rights
                    GROUP BY entity_type, entity_id, broadcast_company_id, division_conference_id
                    HAVING COUNT(*) > 1
                ) as dupes
            """))
            
            dup_count = result.scalar()
            if dup_count > 0:
                print(f"WARNING: There are still {dup_count} duplicate sets\!")
                return
                
            # Approach 1: Create unique index for non-null division_conference_id
            await session.execute(text("""
                CREATE UNIQUE INDEX IF NOT EXISTS uq_broadcast_rights_idx
                ON broadcast_rights (entity_type, entity_id, broadcast_company_id, division_conference_id)
                WHERE division_conference_id IS NOT NULL
            """))
            
            # Approach 2: Create unique index for null division_conference_id
            await session.execute(text("""
                CREATE UNIQUE INDEX IF NOT EXISTS uq_broadcast_rights_null_idx
                ON broadcast_rights (entity_type, entity_id, broadcast_company_id)
                WHERE division_conference_id IS NULL
            """))
            
            await session.commit()
            print("Successfully added unique index constraints")
            
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(add_constraint())
