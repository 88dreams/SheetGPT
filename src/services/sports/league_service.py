from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import SQLAlchemyError
from typing import List, Optional, Dict, Any
from uuid import UUID
import logging
from sqlalchemy import select

from src.models.sports_models import League
from src.schemas.sports import LeagueCreate, LeagueUpdate
from src.services.sports.base_service import BaseEntityService

logger = logging.getLogger(__name__)

class LeagueService(BaseEntityService[League]):
    """Service for managing leagues."""
    
    def __init__(self):
        super().__init__(League)
    
    async def get_leagues(self, db: AsyncSession) -> List[League]:
        """Get all leagues."""
        result = await db.execute(select(League))
        return result.scalars().all()
    
    async def create_league(self, db: AsyncSession, league: LeagueCreate) -> League:
        """Create a new league or update if it already exists."""
        # Check if a league with the same name already exists
        existing_league = await db.execute(
            select(League).where(League.name == league.name)
        )
        db_league = existing_league.scalars().first()

        if db_league:
            # Update existing league
            for key, value in league.dict().items():
                if value is not None:  # Only update non-None values
                    setattr(db_league, key, value)
        else:
            # Create new league
            db_league = League(**league.dict())
            db.add(db_league)
        
        try:
            await db.commit()
            await db.refresh(db_league)
            return db_league
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Error creating/updating league: {str(e)}")
            raise
    
    async def get_league(self, db: AsyncSession, league_id: UUID) -> Optional[League]:
        """Get a league by ID."""
        return await super().get_entity(db, league_id)
    
    async def update_league(self, db: AsyncSession, league_id: UUID, league_update: LeagueUpdate) -> Optional[League]:
        """Update a league."""
        result = await db.execute(select(League).where(League.id == league_id))
        db_league = result.scalars().first()
        if not db_league:
            return None
        
        update_data = league_update.dict(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_league, key, value)
        
        try:
            await db.commit()
            await db.refresh(db_league)
            return db_league
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Error updating league: {str(e)}")
            raise
    
    async def delete_league(self, db: AsyncSession, league_id: UUID) -> bool:
        """Delete a league."""
        return await super().delete_entity(db, league_id)