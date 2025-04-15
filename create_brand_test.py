import asyncio
import json
from uuid import UUID
from datetime import datetime

class CustomEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, UUID):
            return str(obj)
        if isinstance(obj, datetime):
            return obj.isoformat()
        return json.JSONEncoder.default(self, obj)

async def run_test():
    from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
    from sqlalchemy.orm import sessionmaker
    from src.services.sports.brand_service import BrandService
    from src.schemas.sports import BrandCreate
    from src.core.config import settings
    
    # Create async engine and sessionmaker manually
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    
    async with async_session() as db:
        try:
            # Create a test brand with partner fields
            brand_service = BrandService()
            
            # Create brand data with partner fields
            brand_data = {
                "name": "Test Partner Brand 2",
                "industry": "Sportswear",
                "company_type": "Manufacturer", 
                "partner": "NFL",
                "partner_relationship": "Sponsor"
            }
            
            # Create the brand using the service method
            brand_create = BrandCreate(**brand_data)
            result = await brand_service.create_brand(db, brand_create)
            
            # Print the result
            print("\nCreated Brand:")
            brand_dict = {c.name: getattr(result, c.name) for c in result.__table__.columns}
            print(json.dumps(brand_dict, indent=2, cls=CustomEncoder))
            
            # Try to fetch the brand to verify it was created properly
            fetched = await brand_service.get_brand(db, result.id)
            if fetched:
                print("\nFetched Brand:")
                fetched_dict = {c.name: getattr(fetched, c.name) for c in fetched.__table__.columns}
                print(json.dumps(fetched_dict, indent=2, cls=CustomEncoder))
                
                # Specifically verify partner fields
                print("\nPartner Fields:")
                print(f"Partner: {fetched.partner}")
                print(f"Partner Relationship: {fetched.partner_relationship}")
            else:
                print("\nFailed to fetch brand\!")
                
        except Exception as e:
            print(f"Error: {str(e)}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(run_test())
