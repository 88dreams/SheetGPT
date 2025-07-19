from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import SQLAlchemyError
from typing import List, Optional, Dict, Any, Union
from uuid import UUID
import logging
from sqlalchemy import select

from src.models.sports_models import Corporate
from src.schemas.sports import CorporateCreate, CorporateUpdate
from src.services.sports.base_service import BaseEntityService

logger = logging.getLogger(__name__)

class CorporateService(BaseEntityService[Corporate]):
    """Service for managing corporate entities."""
    
    def __init__(self):
        self.model_class = Corporate
        super().__init__(self.model_class)

    async def get_all(self, db: AsyncSession) -> List[Corporate]:
        """Get all corporate entities."""
        result = await db.execute(select(self.model_class))
        return list(result.scalars().all())

    async def create(self, db: AsyncSession, corporate_in: CorporateCreate) -> Corporate:
        """Create a new corporate entity."""
        db_corporate = Corporate(**corporate_in.dict())
        db.add(db_corporate)
        try:
            await db.commit()
            await db.refresh(db_corporate)
            return db_corporate
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Error creating corporate entity: {e}")
            raise

    async def update(self, db: AsyncSession, corporate_id: UUID, corporate_in: CorporateUpdate) -> Optional[Corporate]:
        """Update a corporate entity."""
        db_corporate = await self.get_by_id(db, corporate_id)
        if not db_corporate:
            return None
        
        update_data = corporate_in.dict(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_corporate, key, value)
        
        try:
            await db.commit()
            await db.refresh(db_corporate)
            return db_corporate
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Error updating corporate entity: {e}")
            raise

    async def delete(self, db: AsyncSession, corporate_id: UUID) -> bool:
        """Delete a corporate entity."""
        return await self.delete_entity(db, corporate_id)

    async def get_by_id(self, db: AsyncSession, corporate_id: UUID) -> Optional[Corporate]:
        """Get a corporate entity by ID."""
        return await self.get_entity(db, corporate_id) 