from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import SQLAlchemyError
from typing import List, Optional, Dict, Any
from uuid import UUID
import logging
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from src.models.sports_models import Player, Team, Brand
from src.schemas.sports import PlayerCreate, PlayerUpdate
from src.services.sports.base_service import BaseEntityService
from src.services.sports.validators import EntityValidator

logger = logging.getLogger(__name__)

class PlayerService(BaseEntityService[Player]):
    """Service for managing players."""
    
    def __init__(self):
        super().__init__(Player)
    
    async def get_players(self, db: AsyncSession, team_id: Optional[UUID] = None) -> List[Player]:
        """Get all players, optionally filtered by team, with sponsor eagerly loaded."""
        query = select(Player).options(selectinload(Player.sponsor))
        if team_id:
            query = query.where(Player.team_id == team_id)
        result = await db.execute(query)
        return result.scalars().unique().all()
    
    async def create_player(self, db: AsyncSession, player: PlayerCreate) -> Player:
        """Create a new player or update if it already exists."""
        # Validate that team exists only if team_id is provided
        if player.team_id:
            await EntityValidator.validate_team(db, player.team_id)
            
        # Check if a player with the same name already exists
        existing_player = await db.execute(
            select(Player).where(Player.name == player.name)
        )
        db_player = existing_player.scalars().first()

        if db_player:
            # Update existing player
            update_data = player.model_dump(exclude_unset=True)
            for key, value in update_data.items():
                setattr(db_player, key, value)
        else:
            # Create new player
            create_data = player.model_dump(exclude_none=True)
            db_player = Player(**create_data)
            db.add(db_player)
        
        try:
            await db.commit()
            await db.refresh(db_player)
            return db_player
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Error creating/updating player: {str(e)}")
            raise
    
    async def get_player(self, db: AsyncSession, player_id: UUID) -> Optional[Player]:
        """Get a player by ID."""
        return await super().get_entity(db, player_id)
    
    async def update_player(self, db: AsyncSession, player_id: UUID, player_update: PlayerUpdate) -> Optional[Player]:
        """Update a player."""
        # First get the player
        result = await db.execute(select(Player).where(Player.id == player_id))
        db_player = result.scalars().first()
        
        if not db_player:
            return None
        
        # Update player attributes
        update_data = player_update.model_dump(exclude_unset=True)
        
        # Validate team_id if it's being updated and is not None
        if 'team_id' in update_data and update_data['team_id'] is not None:
            await EntityValidator.validate_team(db, update_data['team_id'])
        # If 'team_id' is in update_data and is None, it means we are intentionally unsetting the team.
        # This is allowed since team_id is nullable.
        
        # Apply updates
        for key, value in update_data.items():
            setattr(db_player, key, value)
        
        try:
            await db.commit()
            await db.refresh(db_player)
            return db_player
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Error updating player: {str(e)}")
            raise
    
    async def delete_player(self, db: AsyncSession, player_id: UUID) -> bool:
        """Delete a player."""
        return await super().delete_entity(db, player_id)