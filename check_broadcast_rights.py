"""
Script to check for potential issues with broadcast rights in the database:
1. Checks for duplicate records
2. Validates foreign key integrity
3. Shows mappings between brands and broadcast companies
4. Provides a detailed report of broadcast rights data
"""
import sys
import os
sys.path.append(os.getcwd())  # Add current dir to path

from sqlalchemy import create_engine, select, text
from src.core.config import settings
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import logging
from src.models.sports_models import BroadcastRights, BroadcastCompany, Brand, League, Team, DivisionConference

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

async def get_entity_name(session, entity_type, entity_id):
    """Get the name of an entity based on its type and ID"""
    try:
        # Normalize entity type
        normalized_type = entity_type.lower().strip()
        
        # Handle different entity types
        if normalized_type in ('league', 'leagues'):
            result = await session.execute(select(League).where(League.id == entity_id))
            entity = result.scalars().first()
        elif normalized_type in ('team', 'teams'):
            result = await session.execute(select(Team).where(Team.id == entity_id))
            entity = result.scalars().first()
        elif normalized_type in ('conference', 'division', 'division_conference'):
            result = await session.execute(select(DivisionConference).where(DivisionConference.id == entity_id))
            entity = result.scalars().first()
        else:
            return f"{entity_type}:{entity_id}"
        
        return entity.name if entity else f"{entity_type}:{entity_id}"
    except Exception as e:
        return f"{entity_type}:{entity_id} (Error: {str(e)})"

async def check_broadcast_rights():
    """Check for issues with broadcast rights in the database"""
    # Create engine and session
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        print("\n" + "="*80)
        print(f"BROADCAST RIGHTS DATABASE CHECK - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("="*80)
        
        # Get total count
        result = await session.execute(text("SELECT COUNT(*) FROM broadcast_rights"))
        total_count = result.scalar()
        print(f"\nTotal broadcast rights records: {total_count}")
        
        # Check for broadcast companies that are actually brands
        print("\n" + "="*80)
        print("CHECKING BRAND/BROADCAST COMPANY MAPPINGS")
        print("="*80)
        brand_check_query = """
        SELECT bc.id, bc.name, b.name as brand_name, b.industry
        FROM broadcast_companies bc
        JOIN brands b ON bc.id = b.id
        """
        brand_check_result = await session.execute(text(brand_check_query))
        matches = brand_check_result.all()
        if matches:
            print(f"\nFound {len(matches)} broadcast companies with matching brand IDs:")
            for match in matches[:10]:  # Show first 10
                print(f"  - {match.name} (company) = {match.brand_name} (brand) - {match.industry}")
            if len(matches) > 10:
                print(f"  ... and {len(matches) - 10} more")
        else:
            print("\nNo broadcast companies share IDs with brands")
        
        # Check for duplicate combinations
        print("\n" + "="*80)
        print("CHECKING FOR DUPLICATE BROADCAST RIGHTS")
        print("="*80)
        result = await session.execute(text("""
            SELECT entity_type, entity_id, broadcast_company_id, division_conference_id, COUNT(*)
            FROM broadcast_rights
            GROUP BY entity_type, entity_id, broadcast_company_id, division_conference_id
            HAVING COUNT(*) > 1
        """))
        duplicates = result.all()
        
        if duplicates:
            print(f"\nFound {len(duplicates)} potential duplicates based on entity_type + entity_id + broadcast_company_id + division_conference_id:")
            for dup in duplicates:
                entity_name = await get_entity_name(session, dup[0], dup[1])
                
                # Get broadcast company name
                company_result = await session.execute(
                    select(BroadcastCompany.name).where(BroadcastCompany.id == dup[2])
                )
                company_name = company_result.scalar() or f"Unknown company {dup[2]}"
                
                print(f"\n  - Entity: {dup[0]} ({entity_name})")
                print(f"    Company: {company_name}")
                print(f"    Division ID: {dup[3]}")
                print(f"    Count: {dup[4]}")
                
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
                    print(f"    * ID: {detail[0]}")
                    print(f"      Territory: {detail[4]}")
                    print(f"      Dates: {detail[5]} to {detail[6]}")
        else:
            print("\nNo duplicates found based on common entity fields")

        # Check for invalid company references
        print("\n" + "="*80)
        print("CHECKING FOR INVALID COMPANY REFERENCES")
        print("="*80)
        invalid_query = """
        SELECT br.id, br.entity_type, br.entity_id, br.broadcast_company_id, br.territory
        FROM broadcast_rights br
        LEFT JOIN broadcast_companies bc ON br.broadcast_company_id = bc.id
        WHERE bc.id IS NULL
        """
        invalid_result = await session.execute(text(invalid_query))
        invalid_rights = invalid_result.all()
        if invalid_rights:
            print(f"\nWARNING! Found {len(invalid_rights)} broadcast rights with invalid company references:")
            for right in invalid_rights:
                entity_name = await get_entity_name(session, right.entity_type, right.entity_id)
                print(f"  - Right ID: {right.id}")
                print(f"    Entity: {right.entity_type} ({entity_name})")
                print(f"    Invalid Company ID: {right.broadcast_company_id}")
                print(f"    Territory: {right.territory}")
        else:
            print("\nAll broadcast rights have valid company references")
            
        # Check for the most recent imports
        print("\n" + "="*80)
        print("MOST RECENT BROADCAST RIGHTS")
        print("="*80)
        result = await session.execute(text("""
            SELECT br.id, br.entity_type, br.entity_id, br.broadcast_company_id, 
                   bc.name as company_name, br.territory, br.division_conference_id, br.created_at
            FROM broadcast_rights br
            JOIN broadcast_companies bc ON br.broadcast_company_id = bc.id
            ORDER BY br.created_at DESC
            LIMIT 10
        """))
        
        print("\nMost recent broadcast rights records:")
        for record in result.all():
            entity_name = await get_entity_name(session, record.entity_type, record.entity_id)
            
            print(f"\n  - ID: {record.id}")
            print(f"    Created: {record.created_at}")
            print(f"    Entity: {record.entity_type} ({entity_name})")
            print(f"    Company: {record.company_name}")
            print(f"    Territory: {record.territory}")
            if record.division_conference_id:
                division_name = await get_entity_name(session, "division_conference", record.division_conference_id)
                print(f"    Division: {division_name}")
            else:
                print("    Division: None")

async def main():
    """Main function to run all checks"""
    try:
        await check_broadcast_rights()
        print("\nCheck completed successfully!")
    except Exception as e:
        logger.error(f"Error during check: {str(e)}")
        raise

if __name__ == "__main__":
    asyncio.run(main())
