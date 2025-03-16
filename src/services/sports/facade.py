from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional, Dict, Any, Type
from uuid import UUID
import logging
import math
from sqlalchemy import select, func

from src.models.sports_models import (
    League, Team, Player, Game, Stadium, 
    BroadcastCompany, BroadcastRights, 
    ProductionCompany, ProductionService,
    Brand, BrandRelationship,
    GameBroadcast, LeagueExecutive,
    DivisionConference
)
from src.schemas.sports import (
    LeagueCreate, LeagueUpdate,
    TeamCreate, TeamUpdate,
    PlayerCreate, PlayerUpdate,
    GameCreate, GameUpdate,
    StadiumCreate, StadiumUpdate,
    BroadcastCompanyCreate, BroadcastCompanyUpdate,
    BroadcastRightsCreate, BroadcastRightsUpdate,
    ProductionCompanyCreate, ProductionCompanyUpdate,
    ProductionServiceCreate, ProductionServiceUpdate,
    BrandCreate, BrandUpdate,
    BrandRelationshipCreate, BrandRelationshipUpdate,
    GameBroadcastCreate, GameBroadcastUpdate,
    LeagueExecutiveCreate, LeagueExecutiveUpdate,
    DivisionConferenceCreate, DivisionConferenceUpdate
)
from src.services.sports.utils import ENTITY_TYPES, get_model_for_entity_type
from src.services.sports.entity_name_resolver import EntityNameResolver
from src.services.sports.league_service import LeagueService
from src.services.sports.team_service import TeamService
from src.services.sports.player_service import PlayerService
from src.services.sports.game_service import GameService
from src.services.sports.stadium_service import StadiumService
from src.services.sports.broadcast_service import BroadcastCompanyService, BroadcastRightsService
from src.services.sports.production_service import ProductionCompanyService, ProductionServiceService
from src.services.sports.brand_service import BrandService, BrandRelationshipService
from src.services.sports.game_broadcast_service import GameBroadcastService
from src.services.sports.league_executive_service import LeagueExecutiveService
from src.services.sports.division_conference_service import DivisionConferenceService

logger = logging.getLogger(__name__)

class SportsService:
    """Facade service for managing sports entities."""
    
    # Entity type mapping 
    ENTITY_TYPES = ENTITY_TYPES
    
    def __init__(self):
        """Initialize the service with its child services."""
        self.league_service = LeagueService()
        self.team_service = TeamService()
        # These will be added as the individual services are created
        # self.player_service = PlayerService()
        # self.game_service = GameService()
        # self.stadium_service = StadiumService()
        # self.broadcast_service = BroadcastService()
        # self.production_service = ProductionService()
        # self.brand_service = BrandService()
    
    async def get_entities(self, db: AsyncSession, entity_type: str, page: int = 1, limit: int = 50, sort_by: str = "id", sort_direction: str = "asc") -> Dict[str, Any]:
        """Get paginated entities of a specific type."""
        if entity_type not in self.ENTITY_TYPES:
            raise ValueError(f"Invalid entity type: {entity_type}")
        
        model_class = self.ENTITY_TYPES[entity_type]
        
        # Get total count
        count_query = select(func.count()).select_from(model_class)
        total_count = await db.scalar(count_query)
        
        # Special handling for division_conference entities to include league_name
        if entity_type == "division_conference":
            # Join with League to get the league name
            query = (
                select(model_class, League.name.label("league_name"))
                .join(League, model_class.league_id == League.id)
            )
            
            # Add sorting - handle special case for league_name
            if sort_by == "league_name":
                # Sort by the league name from the joined League table
                if sort_direction.lower() == "desc":
                    query = query.order_by(League.name.desc())
                else:
                    query = query.order_by(League.name.asc())
            elif hasattr(model_class, sort_by):
                sort_column = getattr(model_class, sort_by)
                if sort_direction.lower() == "desc":
                    query = query.order_by(sort_column.desc())
                else:
                    query = query.order_by(sort_column.asc())
            
            # Add pagination
            query = query.offset((page - 1) * limit).limit(limit)
            
            result = await db.execute(query)
            rows = result.all()
            
            # Process the results to include league_name
            entities_with_league = []
            for row in rows:
                division_conference = row[0]  # The DivisionConference model
                league_name = row[1]          # The league_name from the query
                
                # Convert the model to a dict and add league_name
                entity_dict = self._model_to_dict(division_conference)
                entity_dict["league_name"] = league_name
                
                entities_with_league.append(entity_dict)
            
            return {
                "items": entities_with_league,
                "total": total_count,
                "page": page,
                "size": limit,
                "pages": math.ceil(total_count / limit)
            }
        else:
            # Standard handling for other entity types
            query = select(model_class)
            
            # Add sorting
            if hasattr(model_class, sort_by):
                sort_column = getattr(model_class, sort_by)
                if sort_direction.lower() == "desc":
                    query = query.order_by(sort_column.desc())
                else:
                    query = query.order_by(sort_column.asc())
                    
            # Add pagination
            query = query.offset((page - 1) * limit).limit(limit)
            
            result = await db.execute(query)
            entities = result.scalars().all()
            
            return {
                "items": [self._model_to_dict(entity) for entity in entities],
                "total": total_count,
                "page": page,
                "size": limit,
                "pages": math.ceil(total_count / limit)
            }
    
    def _model_to_dict(self, model: Any) -> Dict[str, Any]:
        """Convert a model instance to a dictionary, including only columns from its own table."""
        result = {}
        # Get only the columns that are defined in this model's table
        for column in model.__table__.columns:
            # This ensures we only include fields that actually belong to this entity type
            result[column.name] = getattr(model, column.name)
        return result
    
    async def get_entities_with_related_names(self, db: AsyncSession, entity_type: str, page: int = 1, limit: int = 50, sort_by: str = "id", sort_direction: str = "asc") -> Dict[str, Any]:
        """Get entities with related entity names for better display in the UI."""
        if entity_type not in self.ENTITY_TYPES:
            raise ValueError(f"Invalid entity type: {entity_type}")
        
        # Get paginated entities
        result = await self.get_entities(db, entity_type, page, limit, sort_by, sort_direction)
        
        # Get the entities list from the result
        entities = result["items"]
        
        # Process results to include related entity names
        processed_items = await EntityNameResolver.get_entities_with_related_names(db, entity_type, entities)
        
        # Clean the entity fields to remove any that shouldn't be included
        final_items = [
            EntityNameResolver.clean_entity_fields(entity_type, item)
            for item in processed_items
        ]
        
        # Return the processed items with the pagination info
        result["items"] = final_items
        return result
    
    # League methods
    async def get_leagues(self, db: AsyncSession) -> List[League]:
        """Get all leagues."""
        return await self.league_service.get_leagues(db)
    
    async def create_league(self, db: AsyncSession, league: LeagueCreate) -> League:
        """Create a new league or update if it already exists."""
        return await self.league_service.create_league(db, league)
    
    async def get_league(self, db: AsyncSession, league_id: UUID) -> Optional[League]:
        """Get a league by ID."""
        return await self.league_service.get_league(db, league_id)
    
    async def update_league(self, db: AsyncSession, league_id: UUID, league_update: LeagueUpdate) -> Optional[League]:
        """Update a league."""
        return await self.league_service.update_league(db, league_id, league_update)
    
    async def delete_league(self, db: AsyncSession, league_id: UUID) -> bool:
        """Delete a league."""
        return await self.league_service.delete_league(db, league_id)
    
    # Team methods
    async def get_teams(self, db: AsyncSession, league_id: Optional[UUID] = None) -> List[Team]:
        """Get all teams, optionally filtered by league."""
        return await self.team_service.get_teams(db, league_id)
    
    async def create_team(self, db: AsyncSession, team: TeamCreate) -> Team:
        """Create a new team or update if it already exists."""
        return await self.team_service.create_team(db, team)
    
    async def get_team(self, db: AsyncSession, team_id: UUID) -> Optional[Team]:
        """Get a team by ID."""
        return await self.team_service.get_team(db, team_id)
    
    async def update_team(self, db: AsyncSession, team_id: UUID, team_update: TeamUpdate) -> Optional[Team]:
        """Update a team."""
        return await self.team_service.update_team(db, team_id, team_update)
    
    async def delete_team(self, db: AsyncSession, team_id: UUID) -> bool:
        """Delete a team."""
        return await self.team_service.delete_team(db, team_id)
    
    # The remaining entity methods would be delegated to their respective services
    # as they are created. For now, we'd keep direct implementations here to maintain
    # the same functionality.
    
    # Entity by name lookup
    async def get_entity_by_name(self, db: AsyncSession, entity_type: str, name: str) -> Optional[dict]:
        """Get an entity by name."""
        if entity_type not in self.ENTITY_TYPES:
            raise ValueError(f"Invalid entity type: {entity_type}")
        
        model_class = self.ENTITY_TYPES[entity_type]
        
        # Use case-insensitive search
        query = select(model_class).where(func.lower(model_class.name) == func.lower(name))
        result = await db.execute(query)
        entity = result.scalars().first()
        
        if entity:
            # Convert to dict
            entity_dict = self._model_to_dict(entity)
            
            # For division_conference, also include the league name
            if entity_type == 'division_conference' and hasattr(entity, 'league_id'):
                league_query = select(League).where(League.id == entity.league_id)
                league_result = await db.execute(league_query)
                league = league_result.scalars().first()
                if league:
                    entity_dict['league_name'] = league.name
            
            return entity_dict
        
        return None