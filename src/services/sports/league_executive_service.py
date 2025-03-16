from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import SQLAlchemyError
from typing import List, Optional, Dict, Any
from uuid import UUID
import logging
from sqlalchemy import select

from src.models.sports_models import LeagueExecutive, League
from src.schemas.sports import LeagueExecutiveCreate, LeagueExecutiveUpdate
from src.services.sports.base_service import BaseEntityService
from src.services.sports.validators import EntityValidator

logger = logging.getLogger(__name__)

class LeagueExecutiveService(BaseEntityService[LeagueExecutive]):
    """Service for managing league executives."""
    
    def __init__(self):
        super().__init__(LeagueExecutive)
    
    async def get_league_executives(self, db: AsyncSession, league_id: Optional[UUID] = None) -> List[LeagueExecutive]:
        """Get all league executives, optionally filtered by league."""
        query = select(LeagueExecutive)
        
        if league_id:
            query = query.where(LeagueExecutive.league_id == league_id)
            
        result = await db.execute(query)
        return result.scalars().all()
    
    async def create_league_executive(self, db: AsyncSession, executive: LeagueExecutiveCreate) -> LeagueExecutive:
        """Create new league executive."""
        # Validate league exists
        await EntityValidator.validate_league(db, executive.league_id)
        
        # Create new league executive
        db_executive = LeagueExecutive(**executive.dict())
        db.add(db_executive)
        
        try:
            await db.commit()
            await db.refresh(db_executive)
            return db_executive
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Error creating league executive: {str(e)}")
            raise
    
    async def get_league_executive(self, db: AsyncSession, executive_id: UUID) -> Optional[LeagueExecutive]:
        """Get league executive by ID."""
        return await super().get_entity(db, executive_id)
    
    async def update_league_executive(self, db: AsyncSession, executive_id: UUID, executive_update: LeagueExecutiveUpdate) -> Optional[LeagueExecutive]:
        """Update league executive."""
        # First get the league executive
        result = await db.execute(select(LeagueExecutive).where(LeagueExecutive.id == executive_id))
        db_executive = result.scalars().first()
        
        if not db_executive:
            return None
        
        # Update attributes
        update_data = executive_update.dict(exclude_unset=True)
        
        # Validate league_id if it's being updated
        if 'league_id' in update_data:
            await EntityValidator.validate_league(db, update_data['league_id'])
        
        # Apply updates
        for key, value in update_data.items():
            setattr(db_executive, key, value)
        
        try:
            await db.commit()
            await db.refresh(db_executive)
            return db_executive
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Error updating league executive: {str(e)}")
            raise
    
    async def delete_league_executive(self, db: AsyncSession, executive_id: UUID) -> bool:
        """Delete league executive."""
        return await super().delete_entity(db, executive_id)