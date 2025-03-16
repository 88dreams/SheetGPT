from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import SQLAlchemyError
from typing import List, Optional, Dict, Any
from uuid import UUID
import logging
from sqlalchemy import select

from src.models.sports_models import Game, League, Team, Stadium
from src.schemas.sports import GameCreate, GameUpdate
from src.services.sports.base_service import BaseEntityService
from src.services.sports.validators import EntityValidator

logger = logging.getLogger(__name__)

class GameService(BaseEntityService[Game]):
    """Service for managing games."""
    
    def __init__(self):
        super().__init__(Game)
    
    async def get_games(self, db: AsyncSession, league_id: Optional[UUID] = None, 
                        team_id: Optional[UUID] = None, season_year: Optional[int] = None) -> List[Game]:
        """Get all games, optionally filtered by league, team, or season year."""
        query = select(Game)
        
        if league_id:
            query = query.where(Game.league_id == league_id)
        
        if team_id:
            # Filter games where the team is either home or away
            query = query.where((Game.home_team_id == team_id) | (Game.away_team_id == team_id))
        
        if season_year:
            query = query.where(Game.season_year == season_year)
            
        result = await db.execute(query)
        return result.scalars().all()
    
    async def create_game(self, db: AsyncSession, game: GameCreate) -> Game:
        """Create a new game."""
        # Validate that league exists
        await EntityValidator.validate_league(db, game.league_id)
        
        # Validate that teams exist
        await EntityValidator.validate_team(db, game.home_team_id)
        await EntityValidator.validate_team(db, game.away_team_id)
        
        # Validate that stadium exists
        await EntityValidator.validate_stadium(db, game.stadium_id)
        
        # Validate teams belong to the specified league
        await EntityValidator.validate_team_league_relationship(db, game.home_team_id, game.league_id)
        await EntityValidator.validate_team_league_relationship(db, game.away_team_id, game.league_id)
        
        # Create new game
        db_game = Game(**game.dict())
        db.add(db_game)
        
        try:
            await db.commit()
            await db.refresh(db_game)
            return db_game
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Error creating game: {str(e)}")
            raise
    
    async def get_game(self, db: AsyncSession, game_id: UUID) -> Optional[Game]:
        """Get a game by ID."""
        return await super().get_entity(db, game_id)
    
    async def update_game(self, db: AsyncSession, game_id: UUID, game_update: GameUpdate) -> Optional[Game]:
        """Update a game."""
        # First get the game
        result = await db.execute(select(Game).where(Game.id == game_id))
        db_game = result.scalars().first()
        
        if not db_game:
            return None
        
        # Update game attributes
        update_data = game_update.dict(exclude_unset=True)
        
        # Perform validations for updated fields
        if 'league_id' in update_data:
            await EntityValidator.validate_league(db, update_data['league_id'])
            
        if 'home_team_id' in update_data:
            await EntityValidator.validate_team(db, update_data['home_team_id'])
            league_id = update_data.get('league_id', db_game.league_id)
            await EntityValidator.validate_team_league_relationship(db, update_data['home_team_id'], league_id)
            
        if 'away_team_id' in update_data:
            await EntityValidator.validate_team(db, update_data['away_team_id'])
            league_id = update_data.get('league_id', db_game.league_id)
            await EntityValidator.validate_team_league_relationship(db, update_data['away_team_id'], league_id)
            
        if 'stadium_id' in update_data:
            await EntityValidator.validate_stadium(db, update_data['stadium_id'])
        
        # Apply updates
        for key, value in update_data.items():
            setattr(db_game, key, value)
        
        try:
            await db.commit()
            await db.refresh(db_game)
            return db_game
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Error updating game: {str(e)}")
            raise
    
    async def delete_game(self, db: AsyncSession, game_id: UUID) -> bool:
        """Delete a game."""
        return await super().delete_entity(db, game_id)