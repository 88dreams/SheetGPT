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
    async def get_leagues(self, db: AsyncSession, 
                         filters: Optional[Dict[str, Any]] = None,
                         page: int = 1, 
                         limit: int = 50,
                         sort_by: str = "name", 
                         sort_direction: str = "asc") -> Dict[str, Any]:
        """
        Get all leagues with optional filtering.
        
        Args:
            db: Database session
            filters: Optional dictionary of field:value pairs to filter on
            page: Page number to retrieve
            limit: Number of items per page
            sort_by: Field to sort by
            sort_direction: Sort direction ("asc" or "desc")
            
        Returns:
            Dictionary with paginated results and metadata
        """
        # Use the enhanced get_entities method from BaseEntityService
        return await super().get_entities(
            db, 
            filters=filters, 
            page=page, 
            limit=limit, 
            sort_by=sort_by, 
            sort_direction=sort_direction
        )
    
    @handle_database_errors
    async def create_league(self, db: AsyncSession, league_data: Union[LeagueCreate, Dict[str, Any]]) -> League:
        """
        Create a new league or update if it already exists.
        
        Args:
            db: Database session
            league_data: League data (either LeagueCreate schema or dict)
            
        Returns:
            The created or updated league
        """
        # Convert to dict if it's a Pydantic model
        if hasattr(league_data, "dict"):
            data = league_data.dict(exclude_unset=True)
        else:
            data = league_data
            
        # Use the enhanced create_entity method with update_if_exists=True
        return await super().create_entity(db, data, update_if_exists=True)
    
    @handle_database_errors
    async def get_league(self, db: AsyncSession, league_id: UUID) -> League:
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
    async def get_league_by_name(self, db: AsyncSession, name: str) -> League:
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
    async def update_league(self, db: AsyncSession, league_id: UUID, league_update: Union[LeagueUpdate, Dict[str, Any]]) -> League:
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
        if hasattr(league_update, "dict"):
            update_data = league_update.dict(exclude_unset=True)
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