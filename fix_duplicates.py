"""
Script to fix duplicate broadcast_rights entries and add a unique constraint
"""
import sys
import os
import time
sys.path.append(os.getcwd())  # Add current dir to path

from sqlalchemy import create_engine, text
from src.core.config import settings
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

async def fix_duplicates():
    # Create engine and session
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        # First, identify duplicates
        result = await session.execute(text("""
            SELECT entity_type, entity_id, broadcast_company_id, division_conference_id, array_agg(id) as ids
            FROM broadcast_rights
            GROUP BY entity_type, entity_id, broadcast_company_id, division_conference_id
            HAVING COUNT(*) > 1
        """))
        
        duplicates = result.all()
        
        if duplicates:
            print(f"Found {len(duplicates)} duplicate groups")
            for dup in duplicates:
                entity_type = dup[0]
                entity_id = dup[1]
                broadcast_company_id = dup[2]
                division_conference_id = dup[3]
                ids = dup[4]
                
                # Keep the first ID, delete the rest
                keep_id = ids[0]
                delete_ids = ids[1:]
                
                print(f"Group: {entity_type}/{entity_id}")
                print(f"  Keeping: {keep_id}")
                print(f"  Deleting: {delete_ids}")
                
                for delete_id in delete_ids:
                    await session.execute(
                        text("DELETE FROM broadcast_rights WHERE id = :id"),
                        {"id": delete_id}
                    )
            
            await session.commit()
            print("Duplicates removed successfully")
        else:
            print("No duplicates found")
        
        # Add unique constraint
        try:
            await session.execute(text("""
                ALTER TABLE broadcast_rights
                ADD CONSTRAINT uq_broadcast_rights 
                UNIQUE (entity_type, entity_id, broadcast_company_id, 
                       COALESCE(division_conference_id, '00000000-0000-0000-0000-000000000000'))
            """))
            await session.commit()
            print("Added unique constraint successfully")
        except Exception as e:
            print(f"Error adding unique constraint: {e}")
            # If this fails, it might be because we need a different approach for NULL values
            try:
                # Try an alternative approach
                await session.execute(text("""
                    CREATE UNIQUE INDEX uq_broadcast_rights_idx
                    ON broadcast_rights (entity_type, entity_id, broadcast_company_id, division_conference_id)
                    WHERE division_conference_id IS NOT NULL
                """))
                await session.execute(text("""
                    CREATE UNIQUE INDEX uq_broadcast_rights_null_idx
                    ON broadcast_rights (entity_type, entity_id, broadcast_company_id)
                    WHERE division_conference_id IS NULL
                """))
                await session.commit()
                print("Added unique index constraints instead")
            except Exception as e2:
                print(f"Error adding unique index: {e2}")

if __name__ == "__main__":
    asyncio.run(fix_duplicates())
