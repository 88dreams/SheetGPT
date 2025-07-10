from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import Dict, List, Any, Optional, Type, Union
from uuid import UUID
import logging

from src.models.sports_models import (
    League, Team, Player, Game, Stadium, 
    BroadcastRights, ProductionService,
    Brand, GameBroadcast, LeagueExecutive,
    DivisionConference
)
from src.schemas.sports import (
    LeagueCreate, LeagueUpdate,
    TeamCreate, TeamUpdate, 
    PlayerCreate, PlayerUpdate,
    GameCreate, GameUpdate,
    StadiumCreate, StadiumUpdate,
    BroadcastRightsCreate, BroadcastRightsUpdate,
    ProductionServiceCreate, ProductionServiceUpdate,
    BrandCreate, BrandUpdate
)

from src.services.sports.league_service import LeagueService
from src.services.sports.team_service import TeamService
from src.services.sports.player_service import PlayerService
from src.services.sports.game_service import GameService
from src.services.sports.stadium_service import StadiumService
from src.services.sports.broadcast_service import BroadcastRightsService, BroadcastCompanyService
from src.services.sports.production_service import ProductionServiceService, ProductionCompanyService
from src.services.sports.brand_service import BrandService
from src.services.sports.game_broadcast_service import GameBroadcastService
from src.services.sports.league_executive_service import LeagueExecutiveService
from src.services.sports.division_conference_service import DivisionConferenceService

from src.services.sports.utils import normalize_entity_type, get_model_for_entity_type
from src.services.sports.entity_name_resolver import EntityNameResolver

logger = logging.getLogger(__name__)

class EntityResolutionError(Exception):
    """Custom exception for entity resolution errors."""
    def __init__(self, message: str, entity_type: str, name_or_id: str, context: Optional[Dict[str, Any]] = None):
        self.message = message
        self.entity_type = entity_type
        self.name_or_id = name_or_id
        self.context = context or {}
        super().__init__(self.message)

    def to_dict(self):
        return {
            "error": "entity_resolution_error",
            "message": self.message,
            "entity_type": self.entity_type,
            "name_or_id": self.name_or_id,
            "context": self.context,
        }

class SportsFacadeV2:
    """
    Enhanced facade service for sports domain providing a unified interface 
    and enhanced entity resolution.
    """
    
    # Entity types with model class mappings
    ENTITY_TYPES = {
        "league": League,
        "team": Team,
        "player": Player,
        "game": Game,
        "stadium": Stadium,
        "broadcast_company": Brand,  # Now using Brand with company_type='Broadcaster'
        "broadcast_rights": BroadcastRights,
        "broadcast": BroadcastRights,  # Alias
        "production_company": Brand,  # Now using Brand with company_type='Production Company'
        "production_service": ProductionService,
        "production": ProductionService,  # Alias
        "brand": Brand,
        "game_broadcast": GameBroadcast,
        "league_executive": LeagueExecutive,
        "division_conference": DivisionConference
    }
    
    def __init__(self):
        # Initialize individual services
        self.league_service = LeagueService()
        self.team_service = TeamService()
        self.player_service = PlayerService()
        self.game_service = GameService()
        self.stadium_service = StadiumService()
        
        # Initialize resolver
        self.name_resolver = EntityNameResolver()
    
    async def get_entities(
        self, 
        db: AsyncSession, 
        entity_type: str, 
        page: int = 1, 
        limit: int = 50, 
        sort_by: str = "id", 
        sort_direction: str = "asc",
        filters: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """Get entities of the specified type with pagination, sorting, and filtering."""
        
        normalized_type = normalize_entity_type(entity_type)
        if normalized_type not in self.ENTITY_TYPES:
            raise ValueError(f"Invalid entity type: {entity_type}")
        
        model_class = self.ENTITY_TYPES[normalized_type]
        query = select(model_class)
        
        # Apply filters if provided
        if filters:
            for filter_config in filters:
                field = filter_config.get("field")
                operator = filter_config.get("operator", "eq")
                value = filter_config.get("value")
                
                if field and value is not None and hasattr(model_class, field):
                    column = getattr(model_class, field)
                    
                    if operator == "eq":
                        query = query.where(column == value)
                    elif operator == "neq":
                        query = query.where(column != value)
                    elif operator == "gt":
                        query = query.where(column > value)
                    elif operator == "gte":
                        query = query.where(column >= value)
                    elif operator == "lt":
                        query = query.where(column < value)
                    elif operator == "lte":
                        query = query.where(column <= value)
                    elif operator == "in" and isinstance(value, list):
                        query = query.where(column.in_(value))
                    elif operator == "not_in" and isinstance(value, list):
                        query = query.where(~column.in_(value))
                    elif operator == "contains" and isinstance(value, str):
                        query = query.where(column.contains(value))
                    elif operator == "icontains" and isinstance(value, str):
                        query = query.where(func.lower(column).contains(func.lower(value)))
                    elif operator == "startswith" and isinstance(value, str):
                        query = query.where(column.startswith(value))
                    elif operator == "istartswith" and isinstance(value, str):
                        query = query.where(func.lower(column).startswith(func.lower(value)))
        
        # Apply sorting
        if sort_by and hasattr(model_class, sort_by):
            column = getattr(model_class, sort_by)
            if sort_direction.lower() == "desc":
                query = query.order_by(column.desc())
            else:
                query = query.order_by(column.asc())
        else:
            # Default sort by ID
            query = query.order_by(model_class.id)
        
        # Get total count for pagination
        count_query = select(func.count()).select_from(query.subquery())
        total_count = await db.scalar(count_query) or 0
        
        # Apply pagination
        offset = (page - 1) * limit
        query = query.offset(offset).limit(limit)
        
        # Execute query
        result = await db.execute(query)
        items = result.scalars().all()
        
        # Convert models to dictionaries
        items_dicts = [self._model_to_dict(item) for item in items]
        
        # Prepare result with pagination info
        return {
            "items": items_dicts,
            "page": page,
            "limit": limit,
            "total": total_count,
            "pages": (total_count + limit - 1) // limit  # Ceiling division
        }
    
    async def get_entities_with_related_names(
        self, 
        db: AsyncSession, 
        entity_type: str, 
        page: int = 1, 
        limit: int = 50, 
        sort_by: str = "id", 
        sort_direction: str = "asc", 
        filters: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """Get entities with related entity names for better display in the UI."""
        
        normalized_type = normalize_entity_type(entity_type)
        if normalized_type not in self.ENTITY_TYPES:
            raise ValueError(f"Invalid entity type: {entity_type}")
        
        # Get paginated entities
        result = await self.get_entities(db, normalized_type, page, limit, sort_by, sort_direction, filters)
        
        # Get the entities list from the result
        entities = result["items"]
        
        # Process results to include related entity names
        processed_items = await self.name_resolver.get_entities_with_related_names(db, normalized_type, entities)
        
        # Clean the entity fields to remove any that shouldn't be included
        final_items = [
            self.name_resolver.clean_entity_fields(normalized_type, item)
            for item in processed_items
        ]
        
        # Return the processed items with the pagination info
        result["items"] = final_items
        return result
    
    def _model_to_dict(self, model: Any) -> Dict[str, Any]:
        """Convert a model instance to a dictionary."""
        result = {}
        # Get the columns defined in this model's table
        for column in model.__table__.columns:
            result[column.name] = getattr(model, column.name)
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
    
    # Player methods
    async def get_players(self, db: AsyncSession, team_id: Optional[UUID] = None) -> List[Player]:
        """Get all players, optionally filtered by team."""
        return await self.player_service.get_players(db, team_id)
    
    async def create_player(self, db: AsyncSession, player: PlayerCreate) -> Player:
        """Create a new player or update if it already exists."""
        return await self.player_service.create_player(db, player)
    
    async def get_player(self, db: AsyncSession, player_id: UUID) -> Optional[Player]:
        """Get a player by ID."""
        return await self.player_service.get_player(db, player_id)
    
    async def update_player(self, db: AsyncSession, player_id: UUID, player_update: PlayerUpdate) -> Optional[Player]:
        """Update a player."""
        return await self.player_service.update_player(db, player_id, player_update)
    
    async def delete_player(self, db: AsyncSession, player_id: UUID) -> bool:
        """Delete a player."""
        return await self.player_service.delete_player(db, player_id)
    
    # Game methods
    async def get_games(self, db: AsyncSession, league_id: Optional[UUID] = None) -> List[Game]:
        """Get all games, optionally filtered by league."""
        return await self.game_service.get_games(db, league_id)
    
    async def create_game(self, db: AsyncSession, game: GameCreate) -> Game:
        """Create a new game."""
        return await self.game_service.create_game(db, game)
    
    async def get_game(self, db: AsyncSession, game_id: UUID) -> Optional[Game]:
        """Get a game by ID."""
        return await self.game_service.get_game(db, game_id)
    
    async def update_game(self, db: AsyncSession, game_id: UUID, game_update: GameUpdate) -> Optional[Game]:
        """Update a game."""
        return await self.game_service.update_game(db, game_id, game_update)
    
    async def delete_game(self, db: AsyncSession, game_id: UUID) -> bool:
        """Delete a game."""
        return await self.game_service.delete_game(db, game_id)
    
    # Stadium methods
    async def get_stadiums(self, db: AsyncSession) -> List[Stadium]:
        """Get all stadiums."""
        return await self.stadium_service.get_stadiums(db)
    
    async def create_stadium(self, db: AsyncSession, stadium: StadiumCreate) -> Stadium:
        """Create a new stadium or update if it already exists."""
        return await self.stadium_service.create_stadium(db, stadium)
    
    async def get_stadium(self, db: AsyncSession, stadium_id: UUID) -> Optional[Stadium]:
        """Get a stadium by ID."""
        return await self.stadium_service.get_stadium(db, stadium_id)
    
    async def update_stadium(self, db: AsyncSession, stadium_id: UUID, stadium_update: StadiumUpdate) -> Optional[Stadium]:
        """Update a stadium."""
        return await self.stadium_service.update_stadium(db, stadium_id, stadium_update)
    
    async def delete_stadium(self, db: AsyncSession, stadium_id: UUID) -> bool:
        """Delete a stadium."""
        return await self.stadium_service.delete_stadium(db, stadium_id)
    
    # BroadcastRights methods
    async def get_broadcast_rights(
        self, 
        db: AsyncSession, 
        entity_type: Optional[str] = None, 
        entity_id: Optional[UUID] = None, 
        company_id: Optional[UUID] = None
    ) -> Dict[str, Any]:
        """Get all broadcast rights, optionally filtered."""
        broadcast_rights_service = BroadcastRightsService()
        return await broadcast_rights_service.get_broadcast_rights(db, entity_type=entity_type, entity_id=entity_id, company_id=company_id)
    
    async def create_broadcast_rights(self, db: AsyncSession, rights: BroadcastRightsCreate) -> Optional[BroadcastRights]:
        """Create new broadcast rights."""
        broadcast_rights_service = BroadcastRightsService()
        
        # Manually resolve references if they're provided as names
        # This logic should ideally be in a dedicated resolver class
        if isinstance(rights.entity_id, str):
            try:
                rights.entity_id = UUID(rights.entity_id)
            except ValueError:
                raise EntityResolutionError("Invalid UUID format for entity_id", "unknown", str(rights.entity_id))

        if isinstance(rights.broadcast_company_id, str):
            try:
                rights.broadcast_company_id = UUID(rights.broadcast_company_id)
            except ValueError:
                raise EntityResolutionError("Invalid UUID format for broadcast_company_id", "broadcast_company", str(rights.broadcast_company_id))

        return await broadcast_rights_service.create_broadcast_rights(db, rights)
    
    async def get_broadcast_right(self, db: AsyncSession, rights_id: UUID) -> Optional[BroadcastRights]:
        """Get broadcast rights by ID."""
        broadcast_rights_service = BroadcastRightsService()
        return await broadcast_rights_service.get_broadcast_right(db, rights_id)
    
    async def update_broadcast_rights(
        self, 
        db: AsyncSession, 
        rights_id: UUID, 
        rights_update: BroadcastRightsUpdate
    ) -> Optional[BroadcastRights]:
        """Update broadcast rights."""
        broadcast_rights_service = BroadcastRightsService()
        
        if hasattr(rights_update, 'entity_id') and rights_update.entity_id and isinstance(rights_update.entity_id, str):
            try:
                rights_update.entity_id = UUID(rights_update.entity_id)
            except ValueError:
                raise EntityResolutionError("Invalid UUID format for entity_id", "unknown", str(rights_update.entity_id))

        if hasattr(rights_update, 'broadcast_company_id') and rights_update.broadcast_company_id and isinstance(rights_update.broadcast_company_id, str):
            try:
                rights_update.broadcast_company_id = UUID(rights_update.broadcast_company_id)
            except ValueError:
                raise EntityResolutionError("Invalid UUID format for broadcast_company_id", "broadcast_company", str(rights_update.broadcast_company_id))

        return await broadcast_rights_service.update_broadcast_rights(db, rights_id, rights_update)
    
    async def delete_broadcast_rights(self, db: AsyncSession, rights_id: UUID) -> bool:
        """Delete broadcast rights."""
        broadcast_rights_service = BroadcastRightsService()
        return await broadcast_rights_service.delete_broadcast_rights(db, rights_id)
    
    # ProductionService methods
    async def get_production_services(
        self, 
        db: AsyncSession, 
        entity_type: Optional[str] = None, 
        entity_id: Optional[UUID] = None, 
        company_id: Optional[UUID] = None
    ) -> Dict[str, Any]:
        """Get all production services, optionally filtered."""
        production_service_service = ProductionServiceService()
        return await production_service_service.get_production_services(db, entity_type=entity_type, entity_id=entity_id, company_id=company_id)
    
    async def create_production_service(
        self, 
        db: AsyncSession, 
        service: ProductionServiceCreate
    ) -> ProductionService:
        """Create a new production service."""
        production_service_service = ProductionServiceService()
        
        if isinstance(service.entity_id, str):
            try:
                service.entity_id = UUID(service.entity_id)
            except ValueError:
                raise EntityResolutionError("Invalid UUID format for entity_id", "unknown", str(service.entity_id))

        if isinstance(service.production_company_id, str):
            try:
                service.production_company_id = UUID(service.production_company_id)
            except ValueError:
                raise EntityResolutionError("Invalid UUID format for production_company_id", "production_company", str(service.production_company_id))

        return await production_service_service.create_production_service(db, service)
    
    async def get_production_service(self, db: AsyncSession, service_id: UUID) -> Optional[ProductionService]:
        """Get a production service by ID."""
        production_service_service = ProductionServiceService()
        return await production_service_service.get_production_service(db, service_id)
    
    async def update_production_service(
        self, 
        db: AsyncSession, 
        service_id: UUID, 
        service_update: ProductionServiceUpdate
    ) -> Optional[ProductionService]:
        """Update a production service."""
        production_service_service = ProductionServiceService()
        
        if hasattr(service_update, 'entity_id') and service_update.entity_id and isinstance(service_update.entity_id, str):
            try:
                service_update.entity_id = UUID(service_update.entity_id)
            except ValueError:
                raise EntityResolutionError("Invalid UUID format for entity_id", "unknown", str(service_update.entity_id))

        if hasattr(service_update, 'production_company_id') and service_update.production_company_id and isinstance(service_update.production_company_id, str):
            try:
                service_update.production_company_id = UUID(service_update.production_company_id)
            except ValueError:
                raise EntityResolutionError("Invalid UUID format for production_company_id", "production_company", str(service_update.production_company_id))

        return await production_service_service.update_production_service(db, service_id, service_update)
    
    async def delete_production_service(self, db: AsyncSession, service_id: UUID) -> bool:
        """Delete a production service."""
        production_service_service = ProductionServiceService()
        return await production_service_service.delete_production_service(db, service_id)
    
    # Brand methods
    async def get_brands(self, db: AsyncSession, industry: Optional[str] = None) -> List[Brand]:
        """Get all brands, optionally filtered by industry."""
        brand_service = BrandService()
        return await brand_service.get_brands(db, industry)
    
    async def create_brand(self, db: AsyncSession, brand: BrandCreate) -> Brand:
        """Create a new brand."""
        brand_service = BrandService()
        return await brand_service.create_brand(db, brand)
    
    async def get_brand(self, db: AsyncSession, brand_id: UUID) -> Optional[Brand]:
        """Get a brand by ID."""
        brand_service = BrandService()
        return await brand_service.get_brand(db, brand_id)
    
    async def update_brand(self, db: AsyncSession, brand_id: UUID, brand_update: BrandUpdate) -> Optional[Brand]:
        """Update a brand."""
        brand_service = BrandService()
        return await brand_service.update_brand(db, brand_id, brand_update)
    
    async def delete_brand(self, db: AsyncSession, brand_id: UUID) -> bool:
        """Delete a brand."""
        brand_service = BrandService()
        return await brand_service.delete_brand(db, brand_id)
    
    # Brand Relationship methods have been removed
    # This functionality has been integrated into the Brand model with partner fields