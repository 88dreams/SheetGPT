"""
Test script to verify API endpoints for broadcast companies and production companies
are correctly using the unified Brand model.
"""

import asyncio
import httpx
import json
import uuid
from typing import Dict, Any, Optional

# Configuration
API_BASE_URL = "http://backend:8000/api/v1"  # Use backend hostname for Docker networking
TEST_USERNAME = "admin@example.com"
TEST_PASSWORD = "password123"

async def login() -> Optional[str]:
    """Login and get access token."""
    print("Logging in...")
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{API_BASE_URL}/auth/login",
            json={"username": TEST_USERNAME, "password": TEST_PASSWORD}
        )
        
        if response.status_code == 200:
            data = response.json()
            token = data.get("access_token")
            print(f"Login successful, got token: {token[:10]}...")
            return token
        else:
            print(f"Login failed: {response.status_code} - {response.text}")
            return None

async def test_broadcast_companies_endpoint(token: str) -> bool:
    """Test the broadcast-companies API endpoint."""
    print("\nTesting broadcast-companies endpoint...")
    headers = {"Authorization": f"Bearer {token}"}
    
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{API_BASE_URL}/sports/broadcast-companies", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            print(f"Success! Found {len(data)} broadcast companies")
            
            # Display a sample broadcast company
            if data:
                company = data[0]
                print(f"Sample broadcaster: {company.get('name')}, type: {company.get('company_type')}")
                # Verify it has the company_type field set to Broadcaster
                if company.get('company_type') == 'Broadcaster':
                    print("✅ Confirmed broadcast company has correct company_type")
                else:
                    print(f"❌ Broadcast company has wrong company_type: {company.get('company_type')}")
                    return False
            return True
        else:
            print(f"Failed to get broadcast companies: {response.status_code} - {response.text}")
            return False

async def test_production_companies_endpoint(token: str) -> bool:
    """Test the production-companies API endpoint."""
    print("\nTesting production-companies endpoint...")
    headers = {"Authorization": f"Bearer {token}"}
    
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{API_BASE_URL}/sports/production-companies", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            print(f"Success! Found {len(data)} production companies")
            
            # Display a sample production company
            if data:
                company = data[0]
                print(f"Sample production company: {company.get('name')}, type: {company.get('company_type')}")
                # Verify it has the company_type field set to Production Company
                if company.get('company_type') == 'Production Company':
                    print("✅ Confirmed production company has correct company_type")
                else:
                    print(f"❌ Production company has wrong company_type: {company.get('company_type')}")
                    return False
            return True
        else:
            print(f"Failed to get production companies: {response.status_code} - {response.text}")
            return False

async def test_broadcast_company_create(token: str) -> Optional[Dict[str, Any]]:
    """Test creating a new broadcast company."""
    print("\nTesting broadcast company creation...")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Create a unique test name
    test_name = f"Test Broadcaster {uuid.uuid4()}"
    test_data = {
        "name": test_name,
        "industry": "Media"
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{API_BASE_URL}/sports/broadcast-companies",
            headers=headers,
            json=test_data
        )
        
        if response.status_code == 200:
            company = response.json()
            print(f"Created broadcast company: {company.get('name')}, ID: {company.get('id')}")
            # Verify it has the company_type field set to Broadcaster
            if company.get('company_type') == 'Broadcaster':
                print("✅ Confirmed created company has correct company_type: Broadcaster")
                return company
            else:
                print(f"❌ Created company has wrong company_type: {company.get('company_type')}")
                return None
        else:
            print(f"Failed to create broadcast company: {response.status_code} - {response.text}")
            return None

async def test_production_company_create(token: str) -> Optional[Dict[str, Any]]:
    """Test creating a new production company."""
    print("\nTesting production company creation...")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Create a unique test name
    test_name = f"Test Production Company {uuid.uuid4()}"
    test_data = {
        "name": test_name,
        "industry": "Production"
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{API_BASE_URL}/sports/production-companies",
            headers=headers,
            json=test_data
        )
        
        if response.status_code == 200:
            company = response.json()
            print(f"Created production company: {company.get('name')}, ID: {company.get('id')}")
            # Verify it has the company_type field set to Production Company
            if company.get('company_type') == 'Production Company':
                print("✅ Confirmed created company has correct company_type: Production Company")
                return company
            else:
                print(f"❌ Created company has wrong company_type: {company.get('company_type')}")
                return None
        else:
            print(f"Failed to create production company: {response.status_code} - {response.text}")
            return None

async def test_broadcast_company_delete(token: str, company_id: str) -> bool:
    """Test deleting a broadcast company."""
    print(f"\nTesting broadcast company deletion for ID: {company_id}")
    headers = {"Authorization": f"Bearer {token}"}
    
    async with httpx.AsyncClient() as client:
        response = await client.delete(
            f"{API_BASE_URL}/sports/broadcast-companies/{company_id}",
            headers=headers
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"Delete result: {result}")
            return True
        else:
            print(f"Failed to delete broadcast company: {response.status_code} - {response.text}")
            return False

async def test_production_company_delete(token: str, company_id: str) -> bool:
    """Test deleting a production company."""
    print(f"\nTesting production company deletion for ID: {company_id}")
    headers = {"Authorization": f"Bearer {token}"}
    
    async with httpx.AsyncClient() as client:
        response = await client.delete(
            f"{API_BASE_URL}/sports/production-companies/{company_id}",
            headers=headers
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"Delete result: {result}")
            return True
        else:
            print(f"Failed to delete production company: {response.status_code} - {response.text}")
            return False

async def test_brands_endpoint(token: str) -> bool:
    """Test the direct brands API endpoint."""
    print("\nTesting brands endpoint...")
    headers = {"Authorization": f"Bearer {token}"}
    
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{API_BASE_URL}/sports/brands", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            print(f"Success! Found {len(data)} brands")
            
            # Display some sample brands of different types
            broadcasters = [b for b in data if b.get('company_type') == 'Broadcaster']
            production_companies = [p for p in data if p.get('company_type') == 'Production Company']
            other_brands = [o for o in data if o.get('company_type') not in ['Broadcaster', 'Production Company']]
            
            print(f"Brands breakdown: {len(broadcasters)} broadcasters, {len(production_companies)} production companies, {len(other_brands)} other brands")
            
            # Show a sample of each type if available
            if broadcasters:
                print(f"Sample broadcaster: {broadcasters[0].get('name')}")
            if production_companies:
                print(f"Sample production company: {production_companies[0].get('name')}")
            if other_brands:
                print(f"Sample other brand: {other_brands[0].get('name')}, type: {other_brands[0].get('company_type')}")
                
            return True
        else:
            print(f"Failed to get brands: {response.status_code} - {response.text}")
            return False

async def main():
    # Skip authentication for now and use a direct test
    token = "test_token"  # We'll use a dummy token for now
    print("Using test mode without authentication...")
    
    # Let's create a direct test to check if the Brand model is being used correctly
    # We'll use the test_brand_api function to test the services directly
    await test_brand_api()
    
    # Test read operations
    bc_passed = await test_broadcast_companies_endpoint(token)
    pc_passed = await test_production_companies_endpoint(token)
    brands_passed = await test_brands_endpoint(token)
    
    # Test write operations - create and delete
    created_bc = await test_broadcast_company_create(token)
    if created_bc:
        # Clean up by deleting
        bc_delete_passed = await test_broadcast_company_delete(token, created_bc.get('id'))
    else:
        bc_delete_passed = False
    
    created_pc = await test_production_company_create(token)
    if created_pc:
        # Clean up by deleting
        pc_delete_passed = await test_production_company_delete(token, created_pc.get('id'))
    else:
        pc_delete_passed = False
    
    # Print summary
    print("\n=== API Test Results ===")
    print(f"Broadcast Companies Endpoint: {'✅ PASSED' if bc_passed else '❌ FAILED'}")
    print(f"Production Companies Endpoint: {'✅ PASSED' if pc_passed else '❌ FAILED'}")
    print(f"Brands Endpoint: {'✅ PASSED' if brands_passed else '❌ FAILED'}")
    print(f"Create Broadcast Company: {'✅ PASSED' if created_bc else '❌ FAILED'}")
    print(f"Delete Broadcast Company: {'✅ PASSED' if bc_delete_passed else '❌ FAILED'}")
    print(f"Create Production Company: {'✅ PASSED' if created_pc else '❌ FAILED'}")
    print(f"Delete Production Company: {'✅ PASSED' if pc_delete_passed else '❌ FAILED'}")
    
    overall = all([bc_passed, pc_passed, brands_passed, bool(created_bc), bc_delete_passed, bool(created_pc), pc_delete_passed])
    print(f"\nOverall Result: {'✅ ALL TESTS PASSED' if overall else '❌ SOME TESTS FAILED'}")


# Legacy direct service test
async def test_brand_api():
    """Legacy test for brand API services directly."""
    from src.utils.database import get_db
    from src.services.sports.broadcast_service import BroadcastCompanyService
    from src.services.sports.production_service import ProductionCompanyService
    from src.services.sports.brand_service import BrandService
    
    # Get a database session
    db_gen = get_db()
    db = await db_gen.__anext__()
    
    try:
        print("\n=== Testing Brand API Services Directly ===")
        
        # 1. Create test broadcaster brand
        brand_service = BrandService()
        broadcast_brand = await brand_service.create_brand(db, {
            "name": "Test Broadcaster",
            "industry": "Testing",
            "company_type": "Broadcaster",
            "country": "Test Country"
        })
        print(f"Created test Broadcaster - Type: {type(broadcast_brand)}")
        # Check if it's a model or dict
        if hasattr(broadcast_brand, 'name'):
            print(f"Created test Broadcaster: {broadcast_brand.name} ({broadcast_brand.id})")
        else:
            # Assume it's a dict
            print(f"Created test Broadcaster: {broadcast_brand.get('name')} ({broadcast_brand.get('id')})")
        
        # 2. Create test production company brand
        production_brand = await brand_service.create_brand(db, {
            "name": "Test Production Company",
            "industry": "Testing",
            "company_type": "Production Company",
            "country": "Test Country"
        })
        print(f"Created test Production Company - Type: {type(production_brand)}")
        # Check if it's a model or dict
        if hasattr(production_brand, 'name'):
            print(f"Created test Production Company: {production_brand.name} ({production_brand.id})")
        else:
            # Assume it's a dict
            print(f"Created test Production Company: {production_brand.get('name')} ({production_brand.get('id')})")
        
        # 3. Test broadcaster service
        broadcast_service = BroadcastCompanyService()
        broadcast_id = broadcast_brand.id  # Already a UUID
        broadcast_data = await broadcast_service.get_broadcast_company(db, broadcast_id)
        
        # Check if it's a model or dict
        if hasattr(broadcast_data, 'name'):
            print(f"\nRetrieved broadcaster: {broadcast_data.name} ({broadcast_data.company_type})")
        else:
            print(f"\nRetrieved broadcaster: {broadcast_data.get('name')} ({broadcast_data.get('company_type')})")
        
        # 4. Test production company service
        production_service = ProductionCompanyService()
        production_id = production_brand.id  # Already a UUID
        production_data = await production_service.get_production_company(db, production_id)
        
        # Check if it's a model or dict
        if hasattr(production_data, 'name'):
            print(f"Retrieved production company: {production_data.name} ({production_data.company_type})")
        else:
            print(f"Retrieved production company: {production_data.get('name')} ({production_data.get('company_type')})")
        
        # 5. Test listing broadcast companies
        broadcast_list = await broadcast_service.get_broadcast_companies(db)
        broadcast_count = len(broadcast_list.get("items", []))
        print(f"Found {broadcast_count} broadcast companies")
        
        # 6. Test listing production companies
        production_list = await production_service.get_production_companies(db)
        production_count = len(production_list.get("items", []))
        print(f"Found {production_count} production companies")
        
        # 7. Test update broadcaster
        updated_data = await broadcast_service.update_broadcast_company(db, broadcast_id, {
            "name": "Updated Test Broadcaster"
        })
        
        # Check if it's a model or dict
        if hasattr(updated_data, 'name'):
            print(f"Updated broadcaster: {updated_data.name} ({updated_data.company_type})")
        else:
            print(f"Updated broadcaster: {updated_data.get('name')} ({updated_data.get('company_type')})")
        
        # 8. Test update production company
        updated_data = await production_service.update_production_company(db, production_id, {
            "name": "Updated Test Production Company"
        })
        
        # Check if it's a model or dict
        if hasattr(updated_data, 'name'):
            print(f"Updated production company: {updated_data.name} ({updated_data.company_type})")
        else:
            print(f"Updated production company: {updated_data.get('name')} ({updated_data.get('company_type')})")
        
        # 9. Clean up: Delete test brands
        await brand_service.delete_brand(db, broadcast_id)
        await brand_service.delete_brand(db, production_id)
        print("\nTest brands deleted. All direct service tests completed successfully!")
        
    except Exception as e:
        import traceback
        print(f"Error: {str(e)}")
        print(traceback.format_exc())
    finally:
        # Make sure to commit any pending changes and close the session
        await db.commit()
        await db.close()


if __name__ == "__main__":
    # Choose which test to run
    TEST_HTTP_API = False  # Set to False to test direct services instead
    
    if TEST_HTTP_API:
        print("Testing HTTP API endpoints...")
        asyncio.run(main())
    else:
        print("Testing direct service interfaces...")
        asyncio.run(test_brand_api())