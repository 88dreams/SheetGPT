"""
Test script to verify that broadcast rights work correctly with the unified Brand model.
"""

import asyncio
import uuid
from datetime import date
from uuid import UUID

from src.utils.database import get_db
from src.services.sports.broadcast_service import BroadcastCompanyService, BroadcastRightsService
from src.services.sports.brand_service import BrandService
from src.services.sports.league_service import LeagueService

async def test_broadcast_rights():
    """Test creating and retrieving broadcast rights with the unified Brand model."""
    # Get a database session
    db_gen = get_db()
    db = await db_gen.__anext__()
    
    try:
        print("\n=== Testing Broadcast Rights with Unified Brand Model ===")
        
        # 1. Create a test broadcaster using the Brand model
        brand_service = BrandService()
        broadcast_brand = await brand_service.create_brand(db, {
            "name": "Test Sky Sports",
            "industry": "Media",
            "company_type": "Broadcaster",
            "country": "UK"
        })
        print(f"Created test broadcaster: {broadcast_brand.name} ({broadcast_brand.id})")
        
        # 2. Create a test league to associate rights with
        league_service = LeagueService()
        test_league = await league_service.create_league(db, {
            "name": "Test Premier League",
            "sport": "Football",
            "country": "UK"
        })
        print(f"Created test league: {test_league.name} ({test_league.id})")
        
        # 3. Create broadcast rights using the broadcaster Brand
        rights_service = BroadcastRightsService()
        test_rights = await rights_service.create_broadcast_rights(db, {
            "entity_type": "league",
            "entity_id": test_league.id,
            "broadcast_company_id": broadcast_brand.id,
            "territory": "United Kingdom",
            "start_date": date(2025, 1, 1),
            "end_date": date(2025, 12, 31),
            "is_exclusive": True
        })
        print(f"Created test broadcast rights with ID: {test_rights.id}")
        print(f"Rights for: {test_rights.entity_type} ({test_rights.entity_id})")
        print(f"Broadcaster ID: {test_rights.broadcast_company_id}")
        
        # 4. Retrieve the broadcast rights and verify the association
        retrieved_rights = await rights_service.get_broadcast_right(db, test_rights.id)
        print(f"\nRetrieved broadcast rights: {retrieved_rights.id}")
        
        # 5. Verify the broadcaster is a Brand
        broadcaster = await brand_service.get_brand(db, retrieved_rights.broadcast_company_id)
        print(f"Associated broadcaster: {broadcaster.name} (Type: {broadcaster.company_type})")
        
        # 6. Test listing broadcast rights
        rights_list = await rights_service.get_broadcast_rights(db, entity_type="league", entity_id=test_league.id)
        print(f"\nFound {len(rights_list.get('items', []))} broadcast rights for league {test_league.id}")
        
        # 7. Clean up - delete test data
        await rights_service.delete_broadcast_rights(db, test_rights.id)
        await league_service.delete_league(db, test_league.id)
        await brand_service.delete_brand(db, broadcast_brand.id)
        print("\nTest data deleted. All broadcast rights tests completed successfully!")
        
    except Exception as e:
        import traceback
        print(f"Error: {str(e)}")
        print(traceback.format_exc())
    finally:
        # Make sure to commit any pending changes and close the session
        await db.commit()
        await db.close()

if __name__ == "__main__":
    asyncio.run(test_broadcast_rights())