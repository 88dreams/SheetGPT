import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from src.utils.database import get_db
from src.services.sports.facade import SportsService

async def test_sorting():
    """Test sorting directly using the SportsService."""
    print("Testing relationship field sorting")
    print("=" * 50)
    
    # Get a database session
    db_gen = get_db()
    try:
        db: AsyncSession = await db_gen.__anext__()
        # Create a SportsService instance
        sports_service = SportsService()
        
        # Test different entity types with relationship field sorting
        await test_entity_sort(sports_service, db, "team", "league_name", "asc")
        await test_entity_sort(sports_service, db, "team", "league_name", "desc")
        
        await test_entity_sort(sports_service, db, "division_conference", "league_name", "asc")
        await test_entity_sort(sports_service, db, "division_conference", "league_name", "desc")
        
        await test_entity_sort(sports_service, db, "production", "production_company_name", "asc")
        await test_entity_sort(sports_service, db, "production", "production_company_name", "desc")
        
        await test_entity_sort(sports_service, db, "broadcast", "broadcast_company_name", "asc")
        await test_entity_sort(sports_service, db, "broadcast", "broadcast_company_name", "desc")
        
        # Test polymorphic relationships
        await test_entity_sort(sports_service, db, "production", "entity_name", "asc")
        await test_entity_sort(sports_service, db, "broadcast", "entity_name", "asc")
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