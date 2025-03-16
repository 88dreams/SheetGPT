from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import SQLAlchemyError
from typing import List, Optional, Dict, Any
from uuid import UUID
import logging
from sqlalchemy import select

from src.models.sports_models import Brand, BrandRelationship
from src.schemas.sports import BrandCreate, BrandUpdate, BrandRelationshipCreate, BrandRelationshipUpdate
from src.services.sports.base_service import BaseEntityService
from src.services.sports.validators import EntityValidator

logger = logging.getLogger(__name__)

class BrandService(BaseEntityService[Brand]):
    """Service for managing brands."""
    
    def __init__(self):
        super().__init__(Brand)
    
    async def get_brands(self, db: AsyncSession) -> List[Brand]:
        """Get all brands."""
        result = await db.execute(select(Brand))
        return result.scalars().all()
    
    async def create_brand(self, db: AsyncSession, brand: BrandCreate) -> Brand:
        """Create a new brand or update if it already exists."""
        # Check if a brand with the same name already exists
        existing_brand = await db.execute(
            select(Brand).where(Brand.name == brand.name)
        )
        db_brand = existing_brand.scalars().first()

        if db_brand:
            # Update existing brand
            for key, value in brand.dict().items():
                if value is not None:  # Only update non-None values
                    setattr(db_brand, key, value)
        else:
            # Create new brand
            db_brand = Brand(**brand.dict())
            db.add(db_brand)
        
        try:
            await db.commit()
            await db.refresh(db_brand)
            return db_brand
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Error creating/updating brand: {str(e)}")
            raise
    
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

class BrandRelationshipService(BaseEntityService[BrandRelationship]):
    """Service for managing brand relationships."""
    
    def __init__(self):
        super().__init__(BrandRelationship)
    
    async def get_brand_relationships(self, db: AsyncSession, 
                                     brand_id: Optional[UUID] = None,
                                     entity_type: Optional[str] = None, 
                                     entity_id: Optional[UUID] = None) -> List[BrandRelationship]:
        """Get all brand relationships, optionally filtered."""
        query = select(BrandRelationship)
        
        if brand_id:
            query = query.where(BrandRelationship.brand_id == brand_id)
            
        if entity_type:
            query = query.where(BrandRelationship.entity_type == entity_type)
            
        if entity_id:
            query = query.where(BrandRelationship.entity_id == entity_id)
            
        result = await db.execute(query)
        return result.scalars().all()
    
    async def create_brand_relationship(self, db: AsyncSession, relationship: BrandRelationshipCreate) -> BrandRelationship:
        """Create new brand relationship."""
        # Validate brand exists
        await EntityValidator.validate_brand(db, relationship.brand_id)
        
        # Validate that the entity exists
        await EntityValidator.validate_entity_type_and_id(db, relationship.entity_type, relationship.entity_id)
        
        # Create new brand relationship
        db_relationship = BrandRelationship(**relationship.dict())
        db.add(db_relationship)
        
        try:
            await db.commit()
            await db.refresh(db_relationship)
            return db_relationship
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Error creating brand relationship: {str(e)}")
            raise
    
    async def get_brand_relationship(self, db: AsyncSession, relationship_id: UUID) -> Optional[BrandRelationship]:
        """Get brand relationship by ID."""
        return await super().get_entity(db, relationship_id)
    
    async def update_brand_relationship(self, db: AsyncSession, relationship_id: UUID, relationship_update: BrandRelationshipUpdate) -> Optional[BrandRelationship]:
        """Update brand relationship."""
        # First get the brand relationship
        result = await db.execute(select(BrandRelationship).where(BrandRelationship.id == relationship_id))
        db_relationship = result.scalars().first()
        
        if not db_relationship:
            return None
        
        # Update attributes
        update_data = relationship_update.dict(exclude_unset=True)
        
        # Perform validations for updated fields
        if 'brand_id' in update_data:
            await EntityValidator.validate_brand(db, update_data['brand_id'])
            
        if 'entity_type' in update_data and 'entity_id' in update_data:
            await EntityValidator.validate_entity_type_and_id(db, update_data['entity_type'], update_data['entity_id'])
        elif 'entity_id' in update_data:
            await EntityValidator.validate_entity_type_and_id(db, db_relationship.entity_type, update_data['entity_id'])
        
        # Apply updates
        for key, value in update_data.items():
            setattr(db_relationship, key, value)
        
        try:
            await db.commit()
            await db.refresh(db_relationship)
            return db_relationship
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Error updating brand relationship: {str(e)}")
            raise
    
    async def delete_brand_relationship(self, db: AsyncSession, relationship_id: UUID) -> bool:
        """Delete brand relationship."""
        return await super().delete_entity(db, relationship_id)