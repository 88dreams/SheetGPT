"""
Script to verify broadcast rights are showing correctly
"""
import sys
import os
sys.path.append(os.getcwd())  # Add current dir to path

from sqlalchemy import create_engine, text
from src.core.config import settings
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

async def verify_fix():
    # Create engine and session
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        # Get count of broadcast rights records
        result = await session.execute(text("SELECT COUNT(*) FROM broadcast_rights"))
        count = result.scalar()
        print(f"Total broadcast rights records: {count}")
        
        # Show all records
        result = await session.execute(text("""
            SELECT id, entity_type, entity_id, broadcast_company_id, territory, 
                   division_conference_id, start_date, end_date, is_exclusive
            FROM broadcast_rights
            ORDER BY created_at DESC
        """))
        
        for row in result.all():
            id, entity_type, entity_id, broadcast_company_id, territory, division_id, start_date, end_date, is_exclusive = row
            print(f"ID: {id}")
            print(f"  Type: {entity_type}, Entity: {entity_id}")
            print(f"  Company: {broadcast_company_id}")
            print(f"  Territory: {territory}")
            print(f"  Division: {division_id}")
            print(f"  Dates: {start_date} to {end_date}")
            print(f"  Is Exclusive: {is_exclusive}")
            print("---")

if __name__ == "__main__":
    asyncio.run(verify_fix())
