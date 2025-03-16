from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import SQLAlchemyError
from typing import List, Optional, Dict, Any
from uuid import UUID
import logging
from sqlalchemy import select

from src.models.sports_models import Stadium, BroadcastCompany
from src.schemas.sports import StadiumCreate, StadiumUpdate
from src.services.sports.base_service import BaseEntityService
from src.services.sports.validators import EntityValidator

logger = logging.getLogger(__name__)

class StadiumService(BaseEntityService[Stadium]):
    """Service for managing stadiums."""
    
    def __init__(self):
        super().__init__(Stadium)
    
    async def get_stadiums(self, db: AsyncSession) -> List[Stadium]:
        """Get all stadiums."""
        result = await db.execute(select(Stadium))
        return result.scalars().all()
    
    async def create_stadium(self, db: AsyncSession, stadium: StadiumCreate) -> Stadium:
        """Create a new stadium or update if it already exists."""
        # Validate host_broadcaster_id if provided
        if stadium.host_broadcaster_id:
            await EntityValidator.validate_broadcast_company(db, stadium.host_broadcaster_id)
            
        # Check if a stadium with the same name already exists
        existing_stadium = await db.execute(
            select(Stadium).where(Stadium.name == stadium.name)
        )
        db_stadium = existing_stadium.scalars().first()

        if db_stadium:
            # Update existing stadium
            for key, value in stadium.dict().items():
                if value is not None:  # Only update non-None values
                    setattr(db_stadium, key, value)
        else:
            # Create new stadium
            db_stadium = Stadium(**stadium.dict())
            db.add(db_stadium)
        
        try:
            await db.commit()
            await db.refresh(db_stadium)
            return db_stadium
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Error creating/updating stadium: {str(e)}")
            raise
    
    async def get_stadium(self, db: AsyncSession, stadium_id: UUID) -> Optional[Stadium]:
        """Get a stadium by ID."""
        return await super().get_entity(db, stadium_id)
    
    async def update_stadium(self, db: AsyncSession, stadium_id: UUID, stadium_update: StadiumUpdate) -> Optional[Stadium]:
        """Update a stadium."""
        # First get the stadium
        result = await db.execute(select(Stadium).where(Stadium.id == stadium_id))
        db_stadium = result.scalars().first()
        
        if not db_stadium:
            return None
        
        # Update stadium attributes
        update_data = stadium_update.dict(exclude_unset=True)
        
        # Validate host_broadcaster_id if it's being updated
        if 'host_broadcaster_id' in update_data and update_data['host_broadcaster_id'] is not None:
            await EntityValidator.validate_broadcast_company(db, update_data['host_broadcaster_id'])
        
        # Apply updates
        for key, value in update_data.items():
            setattr(db_stadium, key, value)
        
        try:
            await db.commit()
            await db.refresh(db_stadium)
            return db_stadium
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Error updating stadium: {str(e)}")
            raise
    
    async def delete_stadium(self, db: AsyncSession, stadium_id: UUID) -> bool:
        """Delete a stadium."""
        return await super().delete_entity(db, stadium_id)