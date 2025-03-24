"""
Simple script to check broadcast rights records with direct SQL
"""
import sys
import os
sys.path.append(os.getcwd())  # Add current dir to path

from sqlalchemy import create_engine, text
from src.core.config import settings
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

async def check_broadcast_rights():
    # Create engine and session
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        # Get total count
        result = await session.execute(text("SELECT COUNT(*) FROM broadcast_rights"))
        total_count = result.scalar()
        print(f"Total broadcast rights records: {total_count}")
        
        # Check for duplicate combinations 
        result = await session.execute(text("""
            SELECT entity_type, entity_id, broadcast_company_id, division_conference_id, COUNT(*)
            FROM broadcast_rights
            GROUP BY entity_type, entity_id, broadcast_company_id, division_conference_id
            HAVING COUNT(*) > 1
        """))
        duplicates = result.all()
        
        if duplicates:
            print("\nFound potential duplicates based on entity_type + entity_id + broadcast_company_id + division_conference_id:")
            for dup in duplicates:
                print(f"  - entity_type: {dup[0]}, entity_id: {dup[1]}, broadcast_company_id: {dup[2]}, division_conference_id: {dup[3]} - Count: {dup[4]}")
                
                # Get the actual records for this combination
                detail_result = await session.execute(text("""
                    SELECT id, entity_type, entity_id, broadcast_company_id, territory, start_date, end_date, division_conference_id
                    FROM broadcast_rights
                    WHERE entity_type = :entity_type 
                    AND entity_id = :entity_id 
                    AND broadcast_company_id = :broadcast_company_id
                    AND (division_conference_id = :division_conference_id OR 
                         (division_conference_id IS NULL AND :division_conference_id IS NULL))
                """), {
                    "entity_type": dup[0], 
                    "entity_id": dup[1], 
                    "broadcast_company_id": dup[2],
                    "division_conference_id": dup[3]
                })
                
                for detail in detail_result.all():
                    print(f"    * ID: {detail[0]}, Territory: {detail[4]}, Dates: {detail[5]} to {detail[6]}")
        else:
            print("\nNo duplicates found based on common entity fields")
            
        # Show all broadcast rights records
        print("\nAll broadcast rights records:")
        result = await session.execute(text("""
            SELECT id, entity_type, entity_id, broadcast_company_id, 
                   territory, division_conference_id, created_at
            FROM broadcast_rights
            ORDER BY created_at DESC
        """))
        
        for record in result.all():
            print(f"  - ID: {record[0]}, Created: {record[6]}")
            print(f"    Entity: {record[1]} {record[2]}, Company: {record[3]}")
            print(f"    Territory: {record[4]}, Division: {record[5]}")
            print("    ---")

if __name__ == "__main__":
    asyncio.run(check_broadcast_rights())
