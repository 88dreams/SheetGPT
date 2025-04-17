"""
Test script to verify that the broadcast and production company services
are working correctly with the unified Brand model.
"""

import asyncio
import argparse
import uuid
from uuid import UUID
import logging

from src.services.sports.broadcast_service import BroadcastCompanyService
from src.services.sports.production_service import ProductionCompanyService
from src.services.sports.brand_service import BrandService
from src.utils.database import get_db

logging.basicConfig(level=logging.INFO, 
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

async def test_company_services():
    """Test the broadcast and production company services."""
    logger.info("Testing broadcast and production company services...")
    
    # Get a database session
    db_gen = get_db()
    # Python 3.9 compatibility - manually advance the generator
    db = await db_gen.__anext__()
    
    try:
        # Test broadcast companies (now using Brand model)
        broadcast_service = BroadcastCompanyService()
        result = await broadcast_service.get_broadcast_companies(db)
        items = result.get("items", [])
        logger.info(f"Found {len(items)} broadcast companies")
        
        # Display sample data if available
        if items:
            # Handle both object and dict results
            if hasattr(items[0], 'name'):
                logger.info(f"First broadcast company: {items[0].name}, type: {items[0].company_type}")
            else:
                logger.info(f"First broadcast company: {items[0].get('name')}, type: {items[0].get('company_type')}")
        
        # Test production companies (now using Brand model)
        production_service = ProductionCompanyService()
        result = await production_service.get_production_companies(db)
        items = result.get("items", [])
        logger.info(f"Found {len(items)} production companies")
        
        # Display sample data if available
        if items:
            # Handle both object and dict results
            if hasattr(items[0], 'name'):
                logger.info(f"First production company: {items[0].name}, type: {items[0].company_type}")
            else:
                logger.info(f"First production company: {items[0].get('name')}, type: {items[0].get('company_type')}")
            
        return True
    except Exception as e:
        logger.error(f"Error testing services: {str(e)}")
        return False
    finally:
        # Close database session
        await db.close()

async def test_create_broadcaster():
    """Test creating a new broadcaster using the BroadcastCompanyService."""
    logger.info("Testing creation of new broadcaster...")
    
    # Get a database session
    db_gen = get_db()
    db = await db_gen.__anext__()
    
    try:
        # Create service instance
        broadcast_service = BroadcastCompanyService()
        
        # Create a test broadcaster
        test_name = f"Test Broadcaster {uuid.uuid4()}"
        test_broadcaster = {
            "name": test_name,
            "industry": "Media",
            "company_type": "Broadcaster"
        }
        
        logger.info(f"Creating test broadcaster: {test_name}")
        created_broadcaster = await broadcast_service.create_broadcast_company(db, test_broadcaster)
        logger.info(f"Created broadcaster with ID: {created_broadcaster.id}")
        logger.info(f"Broadcaster company_type: {created_broadcaster.company_type}")
        
        # Verify we can retrieve the broadcaster
        found_broadcaster = await broadcast_service.get_broadcast_company_by_name(db, test_name)
        if found_broadcaster:
            logger.info(f"Successfully found broadcaster by name: {found_broadcaster.name}")
            
            # Clean up - delete the test broadcaster
            logger.info(f"Deleting test broadcaster: {found_broadcaster.id}")
            deleted = await broadcast_service.delete_broadcast_company(db, found_broadcaster.id)
            logger.info(f"Deleted test broadcaster: {deleted}")
        
        return True
    except Exception as e:
        logger.error(f"Error testing broadcaster creation: {str(e)}")
        return False
    finally:
        # Close database session
        await db.close()

async def test_create_production_company():
    """Test creating a new production company using the ProductionCompanyService."""
    logger.info("Testing creation of new production company...")
    
    # Get a database session
    db_gen = get_db()
    db = await db_gen.__anext__()
    
    try:
        # Create service instance
        production_service = ProductionCompanyService()
        
        # Create a test production company
        test_name = f"Test Production Company {uuid.uuid4()}"
        test_company = {
            "name": test_name,
            "industry": "Production",
            "company_type": "Production Company"
        }
        
        logger.info(f"Creating test production company: {test_name}")
        created_company = await production_service.create_production_company(db, test_company)
        logger.info(f"Created production company with ID: {created_company.id}")
        logger.info(f"Production company_type: {created_company.company_type}")
        
        # Verify we can retrieve the production company
        found_company = await production_service.get_production_company_by_name(db, test_name)
        if found_company:
            logger.info(f"Successfully found production company by name: {found_company.name}")
            
            # Clean up - delete the test production company
            logger.info(f"Deleting test production company: {found_company.id}")
            deleted = await production_service.delete_production_company(db, found_company.id)
            logger.info(f"Deleted test production company: {deleted}")
        
        return True
    except Exception as e:
        logger.error(f"Error testing production company creation: {str(e)}")
        return False
    finally:
        # Close database session
        await db.close()

async def test_broadcast_rights():
    """Test creating and retrieving broadcast rights with the unified Brand model."""
    logger.info("Testing broadcast rights with unified Brand model...")
    
    # Get a database session
    db_gen = get_db()
    db = await db_gen.__anext__()
    
    try:
        from src.services.sports.broadcast_service import BroadcastRightsService
        
        # Create a broadcast rights service
        rights_service = BroadcastRightsService()
        
        # Get a few broadcast rights and check they're connected to brands
        result = await rights_service.get_broadcast_rights(db, limit=5)
        items = result.get("items", [])
        logger.info(f"Found {len(items)} broadcast rights")
        
        # Check details of the first broadcast right
        if items:
            right = items[0]
            # Handle both object and dict results
            if hasattr(right, 'id'):
                right_id = right.id
                company_id = right.broadcast_company_id
            else:
                right_id = right.get('id')
                company_id = right.get('broadcast_company_id')
            
            logger.info(f"Broadcast right ID: {right_id}")
            logger.info(f"Broadcast company ID: {company_id}")
            
            # Load the associated broadcast company (should be a Brand)
            broadcast_service = BroadcastCompanyService()
            company = await broadcast_service.get_broadcast_company(db, company_id)
            
            # Handle both object and dict results for company
            if hasattr(company, 'name'):
                company_name = company.name
                company_type = company.company_type
            else:
                company_name = company.get('name')
                company_type = company.get('company_type')
                
            logger.info(f"Associated company: {company_name}, type: {company_type}")
            
            # Verify it's a Brand model instance (or at least has the right company_type)
            from src.models.sports_models import Brand
            if isinstance(company, Brand):
                logger.info("Successfully confirmed company is a Brand model instance")
            elif company_type == 'Broadcaster':
                logger.info("Company has correct company_type: Broadcaster")
            else:
                logger.error(f"Company does not appear to be a proper Brand: {type(company)}")
        
        return True
    except Exception as e:
        logger.error(f"Error testing broadcast rights: {str(e)}")
        return False
    finally:
        # Close database session
        await db.close()

async def main():
    parser = argparse.ArgumentParser(description='Test the unified Brand model services.')
    parser.add_argument('--list', action='store_true', help='List existing companies')
    parser.add_argument('--broadcaster', action='store_true', help='Test creating a broadcaster')
    parser.add_argument('--production', action='store_true', help='Test creating a production company')
    parser.add_argument('--rights', action='store_true', help='Test broadcast rights with Brand model')
    parser.add_argument('--all', action='store_true', help='Run all tests')
    
    args = parser.parse_args()
    
    # If no specific arguments are provided, run the basic list test
    if not (args.list or args.broadcaster or args.production or args.rights or args.all):
        args.list = True
    
    # Run the selected tests
    all_passed = True
    
    if args.list or args.all:
        passed = await test_company_services()
        logger.info(f"List companies test: {'PASSED' if passed else 'FAILED'}")
        all_passed = all_passed and passed
    
    if args.broadcaster or args.all:
        passed = await test_create_broadcaster()
        logger.info(f"Create broadcaster test: {'PASSED' if passed else 'FAILED'}")
        all_passed = all_passed and passed
    
    if args.production or args.all:
        passed = await test_create_production_company()
        logger.info(f"Create production company test: {'PASSED' if passed else 'FAILED'}")
        all_passed = all_passed and passed
    
    if args.rights or args.all:
        passed = await test_broadcast_rights()
        logger.info(f"Broadcast rights test: {'PASSED' if passed else 'FAILED'}")
        all_passed = all_passed and passed
    
    logger.info(f"All tests: {'PASSED' if all_passed else 'FAILED'}")

if __name__ == "__main__":
    asyncio.run(main())