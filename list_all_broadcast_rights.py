"""
Script to list all broadcast rights and save to a CSV file for inspection
"""
import sys
import os
import csv
sys.path.append(os.getcwd())  # Add current dir to path

from sqlalchemy import create_engine, text
from src.core.config import settings
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

async def list_all_broadcast_rights():
    # Create engine and session
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        # Get all broadcast_rights records with additional information
        result = await session.execute(text("""
            SELECT br.id, 
                   br.entity_type, 
                   br.entity_id, 
                   br.broadcast_company_id,
                   bc.name as broadcast_company_name,
                   br.division_conference_id,
                   dc.name as division_conference_name,
                   br.territory,
                   br.start_date,
                   br.end_date,
                   br.is_exclusive,
                   br.created_at,
                   br.updated_at
            FROM broadcast_rights br
            LEFT JOIN broadcast_companies bc ON br.broadcast_company_id = bc.id
            LEFT JOIN divisions_conferences dc ON br.division_conference_id = dc.id
            ORDER BY br.created_at DESC
        """))
        
        records = result.all()
        print(f"Found {len(records)} broadcast rights records.")
        
        # Save to CSV for easier inspection
        with open('broadcast_rights.csv', 'w', newline='') as csvfile:
            fieldnames = ['id', 'entity_type', 'entity_id', 'broadcast_company_id', 
                         'broadcast_company_name', 'division_conference_id', 
                         'division_conference_name', 'territory', 'start_date', 
                         'end_date', 'is_exclusive', 'created_at', 'updated_at']
            
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()
            
            for record in records:
                # Convert result row to dictionary
                row_dict = dict(zip(fieldnames, record))
                writer.writerow(row_dict)
                
                # Also print details to console
                print(f"ID: {row_dict['id']}")
                print(f"  Entity: {row_dict['entity_type']} {row_dict['entity_id']}")
                print(f"  Broadcast Company: {row_dict['broadcast_company_name']} ({row_dict['broadcast_company_id']})")
                print(f"  Territory: {row_dict['territory']}")
                print(f"  Created: {row_dict['created_at']}")
                print("  ---")

        print(f"CSV file saved as broadcast_rights.csv")

if __name__ == "__main__":
    asyncio.run(list_all_broadcast_rights())
