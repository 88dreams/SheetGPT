from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional, Dict, Any, Union
from uuid import UUID
import logging
from sqlalchemy import select

from src.models.sports_models import League
from src.schemas.sports import LeagueCreate, LeagueUpdate
from src.services.sports.base_service import BaseEntityService
from src.utils.errors import handle_database_errors

logger = logging.getLogger(__name__)

class LeagueService(BaseEntityService[League]):
    """Service for managing leagues."""
    
    def __init__(self):
        super().__init__(League)
    
    @handle_database_errors
    async def get_distinct_sports(self, db: AsyncSession) -> List[str]:
        """Get a list of distinct sport names from all leagues, ordered alphabetically."""
        stmt = select(League.sport).distinct().order_by(League.sport)
        result = await db.execute(stmt)
        sports = [row[0] for row in result.fetchall() if row[0] is not None]
        logger.info(f"Retrieved {len(sports)} distinct sports.")
        return sports
    
    @handle_database_errors
    async def get_leagues(self, db: AsyncSession, 
                         filters: Optional[Dict[str, Any]] = None,
                         # Remove pagination and sorting params if we always get all for this specific method
                         # page: int = 1, 
                         # limit: int = 50,
                         # sort_by: str = "name", 
                         # sort_direction: str = "asc"
                         ) -> List[League]: # Change return type to List[League]
        """
        Get all leagues.
        
        Args:
            db: Database session
            filters: Optional dictionary of field:value pairs to filter on (if needed by get_all_entities_raw)
            
        Returns:
            List of League model instances.
        """
        # Use get_all_models from BaseEntityService to get a flat list of League models
        return await super().get_all_models(db, filters=filters)
    
    @handle_database_errors
    async def create_league(self, db: AsyncSession, league_data: Union[LeagueCreate, Dict[str, Any]]) -> Optional[League]:
        """
        Create a new league or update if it already exists.
        
        Args:
            db: Database session
            league_data: League data (either LeagueCreate schema or dict)
            
        Returns:
            The created or updated league
        """
        # Convert to dict if it's a Pydantic model
        if isinstance(league_data, LeagueCreate):
            data = league_data.model_dump(exclude_unset=True)
        else:
            data = league_data
            
        # Use the enhanced create_entity method with update_if_exists=True
        return await super().create_entity(db, data, update_if_exists=True)
    
    @handle_database_errors
    async def get_league(self, db: AsyncSession, league_id: UUID) -> Optional[League]:
        """
        Get a league by ID.
        
        Args:
            db: Database session
            league_id: UUID of the league to get
            
        Returns:
            The league if found
            
        Raises:
            EntityNotFoundError: If league doesn't exist
        """
        return await super().get_entity(db, league_id)
    
    @handle_database_errors
    async def get_league_by_name(self, db: AsyncSession, name: str) -> Optional[League]:
        """
        Get a league by name (case-insensitive).
        
        Args:
            db: Database session
            name: Name of the league to get
            
        Returns:
            The league if found
            
        Raises:
            EntityNotFoundError: If league doesn't exist
        """
        return await super().get_entity_by_name(db, name)
    
    @handle_database_errors
    async def find_league(self, db: AsyncSession, search_term: str, raise_not_found: bool = False) -> Optional[League]:
        """
        Find a league by name (partial match) or ID.
        
        Args:
            db: Database session
            search_term: Name fragment or UUID string to search for
            raise_not_found: Whether to raise EntityNotFoundError if league doesn't exist
            
        Returns:
            The league if found, None otherwise (if raise_not_found is False)
            
        Raises:
            EntityNotFoundError: If league doesn't exist and raise_not_found is True
        """
        return await super().find_entity(db, search_term, raise_not_found)
    
    @handle_database_errors
    async def update_league(self, db: AsyncSession, league_id: UUID, league_update: Union[LeagueUpdate, Dict[str, Any]]) -> Optional[League]:
        """
        Update a league.
        
        Args:
            db: Database session
            league_id: UUID of the league to update
            league_update: League data to update (either LeagueUpdate schema or dict)
            
        Returns:
            The updated league
            
        Raises:
            EntityNotFoundError: If league doesn't exist
        """
        # Convert to dict if it's a Pydantic model
        if isinstance(league_update, LeagueUpdate):
            update_data = league_update.model_dump(exclude_unset=True)
        else:
            update_data = league_update
            
        return await super().update_entity(db, league_id, update_data)
    
    @handle_database_errors
    async def delete_league(self, db: AsyncSession, league_id: UUID) -> bool:
        """
        Delete a league.
        
        Args:
            db: Database session
            league_id: UUID of the league to delete
            
        Returns:
            True if the league was deleted
            
        Raises:
            EntityNotFoundError: If league doesn't exist
        """
        return await super().delete_entity(db, league_id)