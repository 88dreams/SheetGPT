from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import SQLAlchemyError
from typing import List, Optional, Dict, Any
from uuid import UUID
import logging
from sqlalchemy import select

from src.models.sports_models import DivisionConference, League
from src.schemas.sports import DivisionConferenceCreate, DivisionConferenceUpdate
from src.services.sports.base_service import BaseEntityService
from src.services.sports.validators import EntityValidator

logger = logging.getLogger(__name__)

class DivisionConferenceService(BaseEntityService[DivisionConference]):
    """Service for managing divisions and conferences."""
    
    def __init__(self):
        super().__init__(DivisionConference)
    
    async def get_divisions_conferences(self, db: AsyncSession, league_id: Optional[UUID] = None) -> List[DivisionConference]:
        """Get all divisions/conferences, optionally filtered by league."""
        query = select(DivisionConference)
        
        if league_id:
            query = query.where(DivisionConference.league_id == league_id)
            
        result = await db.execute(query)
        return list(result.scalars().all())
    
    async def create_division_conference(self, db: AsyncSession, division_conference: DivisionConferenceCreate) -> DivisionConference:
        """Create new division/conference or update if it already exists."""
        # Validate league exists
        await EntityValidator.validate_league(db, division_conference.league_id)
        
        # Check if a division/conference with the same name already exists in this league
        existing_div_conf = await db.execute(
            select(DivisionConference).where(
                (DivisionConference.name == division_conference.name) &
                (DivisionConference.league_id == division_conference.league_id)
            )
        )
        db_div_conf = existing_div_conf.scalars().first()

        if db_div_conf:
            # Update existing division/conference
            for key, value in division_conference.dict().items():
                if value is not None:  # Only update non-None values
                    setattr(db_div_conf, key, value)
        else:
            # Create new division/conference
            db_div_conf = DivisionConference(**division_conference.dict())
            db.add(db_div_conf)
        
        try:
            await db.commit()
            await db.refresh(db_div_conf)
            return db_div_conf
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Error creating/updating division/conference: {str(e)}")
            raise
    
    async def get_division_conference(self, db: AsyncSession, division_conference_id: UUID) -> Optional[DivisionConference]:
        """Get division/conference by ID."""
        return await super().get_entity(db, division_conference_id)
    
    async def update_division_conference(self, db: AsyncSession, division_conference_id: UUID, division_conference_update: DivisionConferenceUpdate) -> Optional[DivisionConference]:
        """Update division/conference."""
        # First get the division/conference
        result = await db.execute(select(DivisionConference).where(DivisionConference.id == division_conference_id))
        db_div_conf = result.scalars().first()
        
        if not db_div_conf:
            return None
        
        # Update attributes
        update_data = division_conference_update.dict(exclude_unset=True)
        
        # Validate league_id if it's being updated
        if 'league_id' in update_data:
            await EntityValidator.validate_league(db, update_data['league_id'])
        
        # Apply updates
        for key, value in update_data.items():
            setattr(db_div_conf, key, value)
        
        try:
            await db.commit()
            await db.refresh(db_div_conf)
            return db_div_conf
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Error updating division/conference: {str(e)}")
            raise
    
    async def delete_division_conference(self, db: AsyncSession, division_conference_id: UUID) -> bool:
        """Delete division/conference."""
        return await super().delete_entity(db, division_conference_id)