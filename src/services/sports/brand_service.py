from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import SQLAlchemyError
from typing import List, Optional, Dict, Any, Union
from uuid import UUID
import logging
from sqlalchemy import select

from src.models.sports_models import Brand
from src.schemas.sports import BrandCreate, BrandUpdate
from src.services.sports.base_service import BaseEntityService
from src.services.sports.validators import EntityValidator

logger = logging.getLogger(__name__)

class BrandService(BaseEntityService[Brand]):
    """Service for managing brands - universal entity for all companies."""
    
    def __init__(self):
        super().__init__(Brand)
    
    async def get_brands(self, db: AsyncSession, industry: Optional[str] = None, company_type: Optional[str] = None) -> List[Brand]:
        """Get all brands, optionally filtered by industry or company type."""
        query = select(Brand)
        
        if industry:
            query = query.where(Brand.industry == industry)
            
        if company_type:
            query = query.where(Brand.company_type == company_type)
            
        result = await db.execute(query)
        return result.scalars().all()
    
    async def create_brand(self, db: AsyncSession, brand: Union[BrandCreate, Dict[str, Any]]) -> Brand:
        """Create a new brand or update if it already exists."""
        # Convert dict to Pydantic model if needed
        if isinstance(brand, dict):
            brand_name = brand.get("name")
            brand_data = brand
        else:
            brand_name = brand.name
            brand_data = brand.dict()
            
        # Check if a brand with the same name already exists
        existing_brand = await db.execute(
            select(Brand).where(Brand.name == brand_name)
        )
        db_brand = existing_brand.scalars().first()

        if db_brand:
            # Update existing brand
            for key, value in brand_data.items():
                if value is not None:  # Only update non-None values
                    setattr(db_brand, key, value)
        else:
            # Create new brand
            db_brand = Brand(**brand_data)
            db.add(db_brand)
        
        try:
            await db.commit()
            await db.refresh(db_brand)
            return db_brand
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Error creating/updating brand: {str(e)}")
            raise
    
    async def create_broadcast_company(self, db: AsyncSession, company_data: Dict[str, Any]) -> Brand:
        """Create a brand that represents a broadcast company."""
        # Create a BrandCreate object with broadcast company defaults
        if "industry" not in company_data:
            company_data["industry"] = "Media"
        
        company_data["company_type"] = "Broadcaster"
        
        # Convert to BrandCreate object
        brand_create = BrandCreate(**company_data)
        
        # Create the brand
        return await self.create_brand(db, brand_create)
    
    async def create_production_company(self, db: AsyncSession, company_data: Dict[str, Any]) -> Brand:
        """Create a brand that represents a production company."""
        # Create a BrandCreate object with production company defaults
        if "industry" not in company_data:
            company_data["industry"] = "Production"
        
        company_data["company_type"] = "Production Company"
        
        # Convert to BrandCreate object
        brand_create = BrandCreate(**company_data)
        
        # Create the brand
        return await self.create_brand(db, brand_create)
    
    async def get_broadcast_companies(self, db: AsyncSession) -> List[Brand]:
        """Get all brands that represent broadcast companies."""
        return await self.get_brands(db, company_type="Broadcaster")
    
    async def get_production_companies(self, db: AsyncSession) -> List[Brand]:
        """Get all brands that represent production companies."""
        return await self.get_brands(db, company_type="Production Company")
    
    async def get_brand_by_name(self, db: AsyncSession, name: str) -> Optional[Brand]:
        """Get a brand by name."""
        result = await db.execute(select(Brand).where(Brand.name == name))
        return result.scalars().first()
    
    async def get_brand(self, db: AsyncSession, brand_id: UUID) -> Optional[Brand]:
        """Get a brand by ID."""
        return await super().get_entity(db, brand_id)
    
    async def update_brand(self, db: AsyncSession, brand_id: UUID, brand_update: BrandUpdate) -> Optional[Brand]:
        """Update a brand."""
        # First get the brand
        result = await db.execute(select(Brand).where(Brand.id == brand_id))
        db_brand = result.scalars().first()
        
        if not db_brand:
            return None
        
        # Update brand attributes
        update_data = brand_update.dict(exclude_unset=True)
        
        # Apply updates
        for key, value in update_data.items():
            setattr(db_brand, key, value)
        
        try:
            await db.commit()
            await db.refresh(db_brand)
            return db_brand
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Error updating brand: {str(e)}")
            raise
    
    async def delete_brand(self, db: AsyncSession, brand_id: UUID) -> bool:
        """Delete a brand."""
        return await super().delete_entity(db, brand_id)
