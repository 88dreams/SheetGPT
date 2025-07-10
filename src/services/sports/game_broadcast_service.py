from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import SQLAlchemyError
from typing import List, Optional, Dict, Any
from uuid import UUID
import logging
from sqlalchemy import select

from src.models.sports_models import GameBroadcast, Game, Brand
from src.schemas.sports import GameBroadcastCreate, GameBroadcastUpdate
from src.services.sports.base_service import BaseEntityService
from src.services.sports.validators import EntityValidator

logger = logging.getLogger(__name__)

class GameBroadcastService(BaseEntityService[GameBroadcast]):
    """Service for managing game broadcasts."""
    
    def __init__(self):
        super().__init__(GameBroadcast)
    
    async def get_game_broadcasts(self, db: AsyncSession, 
                                 game_id: Optional[UUID] = None,
                                 broadcast_company_id: Optional[UUID] = None,
                                 production_company_id: Optional[UUID] = None) -> List[GameBroadcast]:
        """Get all game broadcasts, optionally filtered."""
        query = select(GameBroadcast)
        
        if game_id:
            query = query.where(GameBroadcast.game_id == game_id)
            
        if broadcast_company_id:
            query = query.where(GameBroadcast.broadcast_company_id == broadcast_company_id)
            
        if production_company_id:
            query = query.where(GameBroadcast.production_company_id == production_company_id)
            
        result = await db.execute(query)
        return list(result.scalars().all())
    
    async def create_game_broadcast(self, db: AsyncSession, game_broadcast: GameBroadcastCreate) -> GameBroadcast:
        """Create new game broadcast."""
        # Validate game exists
        result = await db.execute(select(Game).where(Game.id == game_broadcast.game_id))
        if not result.scalars().first():
            raise ValueError(f"Game with ID {game_broadcast.game_id} not found")
        
        # Validate broadcast company exists
        await EntityValidator.validate_broadcast_company(db, game_broadcast.broadcast_company_id)
        
        # Validate production company if provided
        if game_broadcast.production_company_id:
            await EntityValidator.validate_production_company(db, game_broadcast.production_company_id)
        
        # Create new game broadcast
        db_game_broadcast = GameBroadcast(**game_broadcast.dict())
        db.add(db_game_broadcast)
        
        try:
            await db.commit()
            await db.refresh(db_game_broadcast)
            return db_game_broadcast
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Error creating game broadcast: {str(e)}")
            raise
    
    async def get_game_broadcast(self, db: AsyncSession, game_broadcast_id: UUID) -> Optional[GameBroadcast]:
        """Get game broadcast by ID."""
        return await super().get_entity(db, game_broadcast_id)
    
    async def update_game_broadcast(self, db: AsyncSession, game_broadcast_id: UUID, game_broadcast_update: GameBroadcastUpdate) -> Optional[GameBroadcast]:
        """Update game broadcast."""
        # First get the game broadcast
        result = await db.execute(select(GameBroadcast).where(GameBroadcast.id == game_broadcast_id))
        db_game_broadcast = result.scalars().first()
        
        if not db_game_broadcast:
            return None
        
        # Update attributes
        update_data = game_broadcast_update.dict(exclude_unset=True)
        
        # Perform validations for updated fields
        if 'game_id' in update_data:
            result = await db.execute(select(Game).where(Game.id == update_data['game_id']))
            if not result.scalars().first():
                raise ValueError(f"Game with ID {update_data['game_id']} not found")
                
        if 'broadcast_company_id' in update_data:
            await EntityValidator.validate_broadcast_company(db, update_data['broadcast_company_id'])
            
        if 'production_company_id' in update_data and update_data['production_company_id'] is not None:
            await EntityValidator.validate_production_company(db, update_data['production_company_id'])
        
        # Apply updates
        for key, value in update_data.items():
            setattr(db_game_broadcast, key, value)
        
        try:
            await db.commit()
            await db.refresh(db_game_broadcast)
            return db_game_broadcast
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Error updating game broadcast: {str(e)}")
            raise
    
    async def delete_game_broadcast(self, db: AsyncSession, game_broadcast_id: UUID) -> bool:
        """Delete game broadcast."""
        return await super().delete_entity(db, game_broadcast_id)