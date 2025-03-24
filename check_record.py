"""
Check if a specific broadcast rights record exists
"""
import sys
import os
sys.path.append(os.getcwd())  # Add current dir to path

from sqlalchemy import create_engine, text
from src.core.config import settings
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

async def check_record():
    # Create engine and session
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        # Check for the specific record
        record_id = "1c3f9116-2795-48d7-904b-cfe685d9e913"
        result = await session.execute(text("""
            SELECT COUNT(*) 
            FROM broadcast_rights 
            WHERE id = :id
        """), {"id": record_id})
        
        count = result.scalar()
        print(f"Record with ID {record_id} exists: {count > 0}")
        
        # Get all broadcast rights records IDs
        result = await session.execute(text("""
            SELECT id FROM broadcast_rights
        """))
        
        ids = [str(row[0]) for row in result.all()]
        print(f"\nExisting broadcast rights IDs ({len(ids)}):")
        for id in ids:
            print(f"  - {id}")

if __name__ == "__main__":
    asyncio.run(check_record())
