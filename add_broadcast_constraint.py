"""
Script to create placeholder broadcast company entries for brands used in broadcast rights
This helps maintain database integrity for foreign key constraints by creating matching
records in the broadcast_companies table for brands used in broadcast rights.
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
from uuid import UUID
from src.models.sports_models import Brand, BroadcastCompany

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

async def create_broadcast_companies_for_brands():
    """
    Creates broadcast company entries for any brands that are referenced in broadcast rights.
    This ensures foreign key integrity while allowing brands to be used for broadcast rights.
    """
    # Create engine and session
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        # Get all brands
        logger.info("Fetching all brands...")
        result = await session.execute(select(Brand))
        brands = result.scalars().all()
        logger.info(f"Found {len(brands)} brands")
        
        # For each brand, check if it has a matching broadcast company entry
        created_count = 0
        for brand in brands:
            # Check if a broadcast company with this ID already exists
            broadcast_result = await session.execute(
                select(BroadcastCompany).where(BroadcastCompany.id == brand.id)
            )
            existing_company = broadcast_result.scalars().first()
            
            if existing_company:
                logger.info(f"Broadcast company already exists for brand '{brand.name}' (ID: {brand.id})")
                continue
            
            # Create a new broadcast company with the same ID as the brand
            try:
                temp_company = BroadcastCompany(
                    id=brand.id,  # Use same ID as brand
                    name=f"{brand.name} (Brand)",
                    type="Brand",
                    country="USA",  # Default
                    created_at=datetime.now(),
                    updated_at=datetime.now()
                )
                session.add(temp_company)
                created_count += 1
                logger.info(f"Created broadcast company for brand '{brand.name}' (ID: {brand.id})")
            except Exception as e:
                logger.error(f"Error creating broadcast company for brand '{brand.name}': {str(e)}")
        
        # Commit all changes
        if created_count > 0:
            await session.commit()
            logger.info(f"Successfully created {created_count} broadcast companies for brands")
        else:
            logger.info("No new broadcast companies needed to be created")

async def add_unique_constraint():
    """
    Adds a unique constraint to the broadcast_rights table after removing duplicates.
    This constraint ensures we don't have duplicate broadcast rights entries.
    """
    # Create engine and session
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        logger.info("Creating a unique constraint on broadcast_rights table...")
        
        # First find duplicates
        duplicates_result = await session.execute(text("""
            SELECT entity_type, entity_id, broadcast_company_id, division_conference_id, 
                   array_agg(id) as ids
            FROM broadcast_rights
            GROUP BY entity_type, entity_id, broadcast_company_id, division_conference_id
            HAVING COUNT(*) > 1
        """))
        duplicates = duplicates_result.all()
        
        # Remove duplicates one by one (keeping first one)
        if duplicates:
            logger.info(f"Found {len(duplicates)} duplicate record groups to clean up")
            for duplicate in duplicates:
                ids = duplicate.ids
                # Keep the first ID, remove the others
                keep_id = ids[0]
                ids_to_delete = ids[1:]
                
                if ids_to_delete:
                    # Convert list of UUIDs to a formatted string for SQL IN clause
                    ids_str = ", ".join([f"'{id}'" for id in ids_to_delete])
                    
                    logger.info(f"Keeping record {keep_id}, removing {len(ids_to_delete)} duplicates")
                    await session.execute(text(f"""
                        DELETE FROM broadcast_rights
                        WHERE id IN ({ids_str})
                    """))
        else:
            logger.info("No duplicates found")
        
        # Check if constraint already exists
        constraint_check = await session.execute(text("""
            SELECT constraint_name
            FROM information_schema.table_constraints 
            WHERE table_name = 'broadcast_rights' AND constraint_name = 'uq_broadcast_rights'
        """))
        constraint_exists = constraint_check.scalar() is not None
        
        if not constraint_exists:
            # Add the constraint
            await session.execute(text("""
                ALTER TABLE broadcast_rights
                ADD CONSTRAINT uq_broadcast_rights 
                UNIQUE (entity_type, entity_id, broadcast_company_id, division_conference_id)
            """))
            logger.info("Unique constraint added successfully!")
        else:
            logger.info("Unique constraint already exists")
        
        await session.commit()

async def check_broadcast_rights_integrity():
    """
    Checks if there are any broadcast rights with invalid broadcast_company_id references.
    """
    # Create engine and session
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        logger.info("Checking for broadcast rights with invalid company references...")
        
        # Check for broadcast rights with invalid broadcast_company_id
        result = await session.execute(text("""
            SELECT br.id, br.broadcast_company_id
            FROM broadcast_rights br
            LEFT JOIN broadcast_companies bc ON br.broadcast_company_id = bc.id
            WHERE bc.id IS NULL
        """))
        
        invalid_rights = result.all()
        
        if invalid_rights:
            logger.warning(f"Found {len(invalid_rights)} broadcast rights with invalid company references:")
            for right in invalid_rights:
                logger.warning(f"  - Broadcast right ID: {right.id}, Company ID: {right.broadcast_company_id}")
            return False
        else:
            logger.info("All broadcast rights have valid company references")
            return True

async def main():
    """
    Main function to run all fixes in sequence
    """
    # First create broadcast companies for brands
    logger.info("Step 1: Creating broadcast companies for brands...")
    await create_broadcast_companies_for_brands()
    
    # Check integrity
    logger.info("Step 2: Checking broadcast rights integrity...")
    integrity_ok = await check_broadcast_rights_integrity()
    
    if integrity_ok:
        # Add unique constraint
        logger.info("Step 3: Adding unique constraint...")
        await add_unique_constraint()
        logger.info("All steps completed successfully")
    else:
        logger.error("Database integrity issues found - fix these before adding constraint")

if __name__ == "__main__":
    asyncio.run(main())
