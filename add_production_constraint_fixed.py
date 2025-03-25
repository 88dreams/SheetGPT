#!/usr/bin/env python3
"""
Script to create production company records for brands that are referenced in production services.
This ensures that when a brand ID is used in place of a production company ID, a corresponding
production company record exists to satisfy foreign key constraints.

In the current model, a ProductionService directly points to a Brand (not a ProductionCompany),
but we still need ProductionCompany records for GameBroadcast relationships.

Usage:
    python add_production_constraint_fixed.py
"""

import asyncio
import logging
from sqlalchemy import select, func, text
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from typing import List, Set, Dict, Any

from src.utils.database import get_db, engine
from src.models.sports_models import ProductionCompany, Brand, ProductionService

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

async def get_all_brands(db: AsyncSession) -> List[Dict[str, Any]]:
    """Get all brands."""
    result = await db.execute(select(Brand))
    brands = result.scalars().all()
    return [
        {
            "id": str(brand.id),
            "name": brand.name,
            "industry": brand.industry,
            "country": brand.country
        }
        for brand in brands
    ]

async def get_production_company_ids(db: AsyncSession) -> Set[UUID]:
    """Get all existing production company IDs."""
    result = await db.execute(select(ProductionCompany.id))
    return {row[0] for row in result}

async def get_brand_ids_used_in_production_services(db: AsyncSession) -> Set[UUID]:
    """Get all brand IDs currently used in production services."""
    result = await db.execute(select(ProductionService.production_company_id).distinct())
    return {row[0] for row in result}

async def create_production_company_from_brand(db: AsyncSession, brand: Dict[str, Any]) -> None:
    """Create a production company from a brand."""
    brand_id = UUID(brand["id"])
    logger.info(f"Creating production company from brand: {brand['name']} (ID: {brand_id})")
    
    # The ProductionCompany only has id and name fields
    production_company = ProductionCompany(
        id=brand_id,
        name=f"{brand['name']} (Brand)"
    )
    db.add(production_company)

async def main():
    """Main function."""
    async with engine.begin() as conn:
        # Get existing production company IDs
        async with AsyncSession(engine) as db:
            production_company_ids = await get_production_company_ids(db)
            logger.info(f"Found {len(production_company_ids)} existing production companies")
            
            # Get brand IDs used in production services
            brand_ids_in_services = await get_brand_ids_used_in_production_services(db)
            logger.info(f"Found {len(brand_ids_in_services)} brand IDs used in production services")
            
            # Get all brands
            brands = await get_all_brands(db)
            logger.info(f"Found {len(brands)} brands")
            
            # Create production companies for brands that are used in production services
            # but don't already have a production company record
            created_count = 0
            for brand in brands:
                brand_id = UUID(brand["id"])
                
                # Check if this brand ID is used in production services and 
                # doesn't already have a production company record
                if brand_id in brand_ids_in_services and brand_id not in production_company_ids:
                    await create_production_company_from_brand(db, brand)
                    created_count += 1
            
            if created_count > 0:
                # Commit the changes
                await db.commit()
                logger.info(f"Created {created_count} production companies from brands")
            else:
                logger.info("No new production companies needed to be created")

if __name__ == "__main__":
    asyncio.run(main())