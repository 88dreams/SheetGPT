"""
Direct test script for relationship field sorting.
This script bypasses authentication by directly calling the SportsService.
"""
import os
import sys
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool

# Setup database connection
DATABASE_URL = "postgresql+asyncpg://postgres:postgres@db:5432/sheetgpt"
engine = create_async_engine(DATABASE_URL, poolclass=NullPool)
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def get_db():
    """Get a database session."""
    async with async_session() as session:
        yield session

# Import local modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from src.services.sports.facade import SportsService

async def test_sorting():
    """Test sorting directly using the SportsService."""
    print("\nTesting relationship field sorting")
    print("=" * 50)
    
    # Get a database session
    async for db in get_db():
        try:
            # Create a SportsService instance
            sports_service = SportsService()
            
            # Test different entity types with relationship field sorting
            await test_entity_sort(sports_service, db, "team", "league_name", "asc")
            await test_entity_sort(sports_service, db, "team", "league_name", "desc")
            
            # Test sorting by league_sport
            await test_entity_sort(sports_service, db, "team", "league_sport", "asc")
            await test_entity_sort(sports_service, db, "team", "league_sport", "desc")
            
            await test_entity_sort(sports_service, db, "division_conference", "league_name", "asc")
            await test_entity_sort(sports_service, db, "division_conference", "league_name", "desc")
            
            # Test sorting by league_sport
            await test_entity_sort(sports_service, db, "division_conference", "league_sport", "asc")
            await test_entity_sort(sports_service, db, "division_conference", "league_sport", "desc")
            
            await test_entity_sort(sports_service, db, "production", "production_company_name", "asc")
            await test_entity_sort(sports_service, db, "production", "production_company_name", "desc")
            
            await test_entity_sort(sports_service, db, "broadcast", "broadcast_company_name", "asc")
            await test_entity_sort(sports_service, db, "broadcast", "broadcast_company_name", "desc")
            
            # Test polymorphic relationships
            await test_entity_sort(sports_service, db, "production", "entity_name", "asc")
            await test_entity_sort(sports_service, db, "broadcast", "entity_name", "asc")
            
            # Test polymorphic relationships with league fields
            await test_entity_sort(sports_service, db, "production", "league_name", "asc")
            await test_entity_sort(sports_service, db, "production", "league_sport", "asc")
            await test_entity_sort(sports_service, db, "broadcast", "league_name", "asc")
            await test_entity_sort(sports_service, db, "broadcast", "league_sport", "asc")
        finally:
            await db.close()

async def test_entity_sort(service, db, entity_type, sort_field, sort_direction):
    """Test sorting for a specific entity type and field."""
    print(f"\n=== Testing {entity_type} sorted by {sort_field} ({sort_direction}) ===")
    
    try:
        # Get entities with the requested sorting
        result = await service.get_entities_with_related_names(
            db, 
            entity_type, 
            page=1, 
            limit=10, 
            sort_by=sort_field, 
            sort_direction=sort_direction
        )
        
        # Display results
        items = result.get("items", [])
        if not items:
            print(f"No items found for {entity_type}")
            return
            
        print(f"Got {len(items)} items, total: {result.get('total', 'unknown')}")
        
        # Print each item's name and the sort field value
        for i, item in enumerate(items, 1):
            item_name = item.get("name", "Unknown")
            sort_value = item.get(sort_field, "N/A")
            print(f"{i}. {item_name} - {sort_field}: {sort_value}")
            
        # Print page info
        print(f"Page {result.get('page', 1)} of {result.get('pages', 1)}")
        
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    asyncio.run(test_sorting())