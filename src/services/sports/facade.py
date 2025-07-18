from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional, Dict, Any, Tuple
from uuid import UUID
import logging
import math
from sqlalchemy import select, func, or_, desc, asc, inspect, column, text
from sqlalchemy.types import String, Text,  VARCHAR # Import string types for checking
from sqlalchemy.orm import aliased, contains_eager, selectinload # Added aliased and contains_eager
from sqlalchemy.exc import SQLAlchemyError, NoResultFound, IntegrityError
from sqlalchemy.sql.expression import literal_column

from src.models.sports_models import (
    League, Team, Player, Game, Stadium, 
    BroadcastRights, ProductionService,
    Brand, GameBroadcast, LeagueExecutive,
    DivisionConference, Corporate
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
from src.services.sports.production_service import ProductionServiceService
from src.services.sports.brand_service import BrandService
from src.services.sports.game_broadcast_service import GameBroadcastService
from src.services.sports.league_executive_service import LeagueExecutiveService
from src.services.sports.division_conference_service import DivisionConferenceService
from src.services.sports.corporate_service import CorporateService
from src.utils.database import get_db_session as get_session # Added import
from src.services.sports.base_service import BaseEntityService # Corrected import path

logger = logging.getLogger(__name__)

# Define the relationship map for searchable related fields
# Path items are relationship attribute names (strings) on the *current* model in the traversal
# Target_fields are attribute names (strings) on the *final* model in the path
SEARCH_RELATIONSHIP_MAP = {
    # BroadcastRights (entity_type="broadcast")
    ("broadcast", "league_name"): {
        "path_attrs": ["division_conference", "league"], 
        "target_fields": ["name", "nickname"]
    },
    ("broadcast", "league_sport"): { 
        "path_attrs": ["division_conference", "league"], 
        "target_fields": ["sport"]
    },
    ("broadcast", "division_conference_name"): {
        "path_attrs": ["division_conference"],
        "target_fields": ["name", "nickname"]
    },
    ("broadcast", "broadcast_company_name"): {
        "path_attrs": ["broadcaster"], # broadcaster is relationship from BroadcastRights to Brand
        "target_fields": ["name"]
    },
    # ("broadcast", "entity_name"): { ... deferred for now due to polymorphism ... }

    # ProductionService (entity_type="production")
    ("production", "production_company_name"): {
        "path_attrs": ["production_company"], # production_company is relationship to Brand
        "target_fields": ["name"]
    },
    ("production", "secondary_brand_name"): {
        "path_attrs": ["secondary_brand"],    # secondary_brand is relationship to Brand
        "target_fields": ["name"]
    },
    # ("production", "entity_name"): { ... deferred for now due to polymorphism ... }

    # Team (entity_type="team")
    ("team", "league_name"): {
        "path_attrs": ["league"],
        "target_fields": ["name", "nickname"]
    },
    ("team", "division_conference_name"): {
        "path_attrs": ["division_conference"],
        "target_fields": ["name", "nickname"]
    },
    ("team", "stadium_name"): {
        "path_attrs": ["stadium"],
        "target_fields": ["name"]
    }
    # TODO: Add more mappings for other entity_types and their relevant related fields
}

class SportsService:
    """Facade service for managing sports entities."""
    
    # Entity type mapping 
    ENTITY_TYPES = ENTITY_TYPES
    
    def __init__(self):
        """Initialize the service with its child services."""
        self.league_service = LeagueService()
        self.team_service = TeamService()
        self.stadium_service = StadiumService()
        self.player_service = PlayerService()
        self.game_service = GameService()
        self.brand_service = BrandService()
        self.corporate_service = CorporateService()
    
    async def get_relationship_sort_config(self, entity_type: str, sort_by: str) -> Optional[Dict[str, Any]]:
        """
        Returns a configuration for sorting by relationship fields.
        Returns None if sort_by is not a relationship field.
        """
        # Map of entity types to their relationship fields and join configurations
        RELATIONSHIP_SORTS = {
            "division_conference": {
                "league_name": {"join_model": League, "join_field": "league_id", "sort_field": "name"},
                "league_sport": {"join_model": League, "join_field": "league_id", "sort_field": "sport"},
            },
            "team": {
                "league_name": {"join_model": League, "join_field": "league_id", "sort_field": "name"},
                "league_sport": {"join_model": League, "join_field": "league_id", "sort_field": "sport"},
                "division_conference_name": {"join_model": DivisionConference, "join_field": "division_conference_id", "sort_field": "name"},
                "stadium_name": {"join_model": Stadium, "join_field": "stadium_id", "sort_field": "name"},
            },
            "player": {
                "team_name": {"join_model": Team, "join_field": "team_id", "sort_field": "name"},
            },
            "game": {
                "league_name": {"join_model": League, "join_field": "league_id", "sort_field": "name"},
                "league_sport": {"join_model": League, "join_field": "league_id", "sort_field": "sport"},
                "home_team_name": {"join_model": Team, "join_field": "home_team_id", "sort_field": "name"},
                "away_team_name": {"join_model": Team, "join_field": "away_team_id", "sort_field": "name"},
                "stadium_name": {"join_model": Stadium, "join_field": "stadium_id", "sort_field": "name"},
            },
            "game_broadcast": {
                "game_name": {"join_model": Game, "join_field": "game_id", "sort_field": "name"},
                "broadcast_company_name": {"join_model": Brand, "join_field": "broadcast_company_id", "sort_field": "name"},
                "production_company_name": {"join_model": Brand, "join_field": "production_company_id", "sort_field": "name"},
            },
            "broadcast": {
                "broadcast_company_name": {"join_model": Brand, "join_field": "broadcast_company_id", "sort_field": "name"},
                "entity_name": None,  # Special case, depends on entity_type
                "league_name": None,  # Special case, populated based on relationships
                "league_sport": None,  # Special case, populated based on relationships
            },
            "production": {
                "production_company_name": {"join_model": Brand, "join_field": "production_company_id", "sort_field": "name"},
                "entity_name": None,  # Special case, depends on entity_type
                "league_name": None,  # Special case, populated based on relationships
                "league_sport": None,  # Special case, populated based on relationships
            },
            "league_executive": {
                "league_name": {"join_model": League, "join_field": "league_id", "sort_field": "name"},
                "league_sport": {"join_model": League, "join_field": "league_id", "sort_field": "sport"},
            },
            "brand_relationship": {
                "brand_name": {"join_model": Brand, "join_field": "brand_id", "sort_field": "name"},
                "entity_name": None,  # Special case, depends on entity_type
            },
        }
        
        # Special handling for polymorphic relationships and their related fields
        if entity_type in ["broadcast", "production", "brand_relationship"]:
            # Fields that require special handling for polymorphic entity types
            polymorphic_fields = ["entity_name", "league_name", "league_sport"]
            
            if sort_by in polymorphic_fields:
                # In this case, we can't do direct sorting at the database level due to polymorphic relationship
                # Return a special flag to handle this in the main method
                return {"special_case": "polymorphic", "entity_type": entity_type, "sort_field": sort_by}
            
        if entity_type in RELATIONSHIP_SORTS and sort_by in RELATIONSHIP_SORTS[entity_type]:
            return RELATIONSHIP_SORTS[entity_type][sort_by]
        
        return None
        
    async def get_entities(self, db: AsyncSession, entity_type: str, page: int = 1, limit: int = 50, sort_by: str = "id", sort_direction: str = "asc") -> Optional[Dict[str, Any]]:
        """Get paginated entities of a specific type."""
        if entity_type not in self.ENTITY_TYPES:
            raise ValueError(f"Invalid entity type: {entity_type}")
        
        model_class = self.ENTITY_TYPES[entity_type]
        if not model_class:
            raise ValueError(f"No model class found for entity type: {entity_type}")

        # Get total count
        count_query = select(func.count()).select_from(model_class)
        total_count_result = await db.execute(count_query)
        total_count = total_count_result.scalar() or 0
        
        # Handle sorting for Creator and Management, which do not have a 'name' field
        if entity_type in ["creator", "management"] and sort_by == "name":
            sort_by = "last_name"

        # Check if we're sorting by a relationship field
        relationship_sort = await self.get_relationship_sort_config(entity_type, sort_by)
        
        logger.info(f"Sorting {entity_type} by {sort_by} ({sort_direction}) - Relationship sort config: {relationship_sort}")
        
        # Handle regular relationship sort (non-polymorphic)
        if relationship_sort and not relationship_sort.get("special_case"):
            join_model = relationship_sort.get("join_model")
            join_field = relationship_sort.get("join_field")
            sort_field = relationship_sort.get("sort_field")

            if join_model and join_field and sort_field:
                logger.info(f"Processing relationship sort with join_model={join_model.__name__}, join_field={join_field}, sort_field={sort_field}")
                
                query = (
                    select(model_class, getattr(join_model, sort_field).label(sort_by))
                    .outerjoin(join_model, getattr(model_class, join_field) == join_model.id)
                )
                
                sort_order = getattr(join_model, sort_field).desc().nulls_last() if sort_direction.lower() == "desc" else getattr(join_model, sort_field).asc().nulls_last()
                query = query.order_by(sort_order)
                
                query = query.offset((page - 1) * limit).limit(limit)
                
                result = await db.execute(query)
                rows = result.all()
                
                entities_with_joined = []
                for row in rows:
                    entity = row[0]
                    joined_value = row[1]
                    
                    entity_dict = self._model_to_dict(entity)
                    if entity_dict:
                        entity_dict[sort_by] = joined_value
                        entities_with_joined.append(entity_dict)
                
                total_pages = math.ceil(total_count / limit) if total_count > 0 else 0
                return {
                    "items": entities_with_joined,
                    "total": total_count,
                    "page": page,
                    "size": limit,
                    "pages": total_pages
                }
            else:
                logger.error(f"Invalid relationship sort config for {entity_type} by {sort_by}: {relationship_sort}")
                # Fallback to default sorting, which will be handled below

        # Handle special case for polymorphic relationships
        elif relationship_sort and relationship_sort.get("special_case") == "polymorphic":
            logger.info(f"Processing polymorphic relationship sort for {entity_type} by {sort_by}")
            
            buffer_limit = limit * 3
            query = select(model_class).offset((page - 1) * limit).limit(buffer_limit)
            
            result = await db.execute(query)
            entities = result.scalars().all()
            entities_dicts = [self._model_to_dict(entity) for entity in entities if entity]
            
            # Process them to add the related names
            processed_entities = await EntityNameResolver.get_entities_with_related_names(
                db, entity_type, [d for d in entities_dicts if d is not None])
            
            # Now sort the processed entities by the requested field
            def get_sort_key(entity: Dict[str, Any]) -> str:
                value = entity.get(sort_by)
                if value is None:
                    return ""
                return str(value).lower()
            
            sorted_entities = sorted(processed_entities, key=get_sort_key, reverse=(sort_direction.lower() == "desc"))
            
            paginated_entities = sorted_entities[:limit]
            
            logger.info(f"Returning {len(paginated_entities)} entities after in-memory sorting by {sort_by}")
            
            total_pages = math.ceil(total_count / limit) if total_count > 0 else 0
            return {
                "items": paginated_entities,
                "total": total_count,
                "page": page,
                "size": limit,
                "pages": total_pages
            }
            
        # Standard handling for direct model fields or fallback from failed relationship sort
        query = select(model_class)
        
        # Original query construction
        sort_attr = getattr(model_class, sort_by, None)
        if sort_attr:
            sort_column = sort_attr
            if sort_direction.lower() == "desc":
                query = query.order_by(sort_column.desc())
            else:
                query = query.order_by(sort_column.asc())
        else:
            logger.warning(f"Field {sort_by} not found in {entity_type} model, defaulting to id sorting")
            sort_column = getattr(model_class, "id")
            if sort_direction.lower() == "desc":
                query = query.order_by(sort_column.desc())
            else:
                query = query.order_by(sort_column.asc())

        paginated_query = query.offset((page - 1) * limit).limit(limit)

        try:
            # First attempt to execute the query as constructed
            result = await db.execute(paginated_query)
            entities = result.scalars().all()
        except SQLAlchemyError as e:
            # Check if the error is due to an undefined column, which likely means a schema mismatch
            if "undefined_column" in str(e).lower() or "does not exist" in str(e).lower():
                logger.warning(f"Sorting by '{sort_by}' failed for {entity_type}, likely due to a schema mismatch. Error: {e}. Falling back to sorting by 'id'.")
                
                # Construct a fallback query, sorting by 'id'
                fallback_query = select(model_class)
                id_sort_column = getattr(model_class, "id")
                if sort_direction.lower() == "desc":
                    fallback_query = fallback_query.order_by(id_sort_column.desc())
                else:
                    fallback_query = fallback_query.order_by(id_sort_column.asc())
                
                paginated_fallback_query = fallback_query.offset((page - 1) * limit).limit(limit)
                
                # Execute the fallback query
                result = await db.execute(paginated_fallback_query)
                entities = result.scalars().all()
            else:
                # If it's a different SQL error, re-raise it
                raise

        logger.info(f"Returning {len(entities)} entities for {entity_type}")
        
        total_pages = math.ceil(total_count / limit) if total_count > 0 else 0
        return {
            "items": [self._model_to_dict(entity) for entity in entities if entity],
            "total": total_count,
            "page": page,
            "size": limit,
            "pages": total_pages
        }
    
    def _model_to_dict(self, model_instance: Any) -> Optional[Dict[str, Any]]:
        if not model_instance:
            return None
        
        logger.debug(f"[_model_to_dict] Serializing instance of {model_instance.__class__.__name__} with ID: {getattr(model_instance, 'id', 'N/A')}")
        entity_dict = {}
        try:
            for c in inspect(model_instance.__class__).mapper.column_attrs:
                try:
                    value = getattr(model_instance, c.key)
                    entity_dict[c.key] = value
                    logger.debug(f"[_model_to_dict] Successfully serialized attribute: {c.key} = {value}")
                except Exception as e_attr:
                    logger.error(f"[_model_to_dict] Error serializing attribute {c.key} for instance {getattr(model_instance, 'id', 'N/A')}: {e_attr}", exc_info=True)
                    # Optionally, you could choose to skip the problematic attribute or raise the error:
                    # entity_dict[c.key] = f"ERROR_SERIALIZING: {e_attr}" 
                    # raise e_attr # Re-raise to see the 500 immediately with this specific attribute error
            logger.debug(f"[_model_to_dict] Successfully serialized instance {getattr(model_instance, 'id', 'N/A')}")
            return entity_dict
        except Exception as e_main:
            logger.error(f"[_model_to_dict] General error during serialization of instance {getattr(model_instance, 'id', 'N/A')}: {e_main}", exc_info=True)
            raise # Re-raise the original error to maintain 500 behavior but with more logs
    
    async def get_entities_with_related_names(
        self,
        entity_type: str,
        page: int = 1,
        page_size: int = 10,
        sort_field: Optional[str] = None,
        sort_direction: Optional[str] = "asc",
        filters: Optional[List[Dict[str, Any]]] = None,
        include_related: bool = True
    ) -> Tuple[List[Dict[str, Any]], int]:
        logger.debug(f"Service: Getting entities for {entity_type} with page={page}, page_size={page_size}, sort_field={sort_field}, sort_direction={sort_direction}, filters={filters}, include_related={include_related}")
        
        if entity_type == 'corporate':
            async with get_session() as session:
                # Use the CorporateService to get all corporate entities
                all_corporates = await self.corporate_service.get_all(session)
                
                # Manual filtering and sorting for corporate entities
                # (Assuming corporate entities don't have complex relationships for now)
                
                filtered_corporates = all_corporates
                if filters:
                    # Implement basic filtering if needed
                    pass
                    
                if sort_field and hasattr(Corporate, sort_field):
                    filtered_corporates.sort(
                        key=lambda x: getattr(x, sort_field) or '',
                        reverse=(sort_direction == 'desc')
                    )

                total_count = len(filtered_corporates)
                
                start_index = (page - 1) * page_size
                end_index = start_index + page_size
                paginated_corporates = filtered_corporates[start_index:end_index]
                
                # Convert to dicts for response, filtering out any None results
                corporate_dicts = [d for d in (self._model_to_dict(c) for c in paginated_corporates) if d is not None]
                return corporate_dicts, total_count

        async with get_session() as session:
            model_class = self.ENTITY_TYPES.get(entity_type)
            if not model_class:
                logger.error(f"Service: Invalid entity type: {entity_type}")
                raise ValueError(f"Invalid entity type: {entity_type}")

            query = select(model_class)

            # 1. Separate search filter from other filters
            search_filter = None
            other_filters = []
            if filters:
                for f in filters:
                    if f.get("field", "").startswith("search_columns:"):
                        search_filter = f
                    else:
                        other_filters.append(f)
            
            # 2. Apply other (non-search) filters to the DB query
            if other_filters:
                for filter_item in other_filters:
                    field = filter_item.get("field")
                    operator = filter_item.get("operator")
                    value = filter_item.get("value")

                    if not field or not operator:
                        logger.warning(f"Skipping invalid filter item: {filter_item}")
                        continue
                    
                    logger.debug(f"Processing filter: field={field}, operator={operator}, value={value}")

                    if field.startswith("search_columns:") and operator == "contains":
                        column_names = field.split("search_columns:")[1].split(',')
                        or_conditions = []
                        for col_name in column_names:
                            if hasattr(model_class, col_name):
                                column_attr = getattr(model_class, col_name)
                                if isinstance(column_attr.type, (String, Text, VARCHAR)):
                                    or_conditions.append(func.lower(column_attr).contains(str(value).lower()))
                                else:
                                    logger.warning(f"Column '{col_name}' is not a string type, skipping for text search.")
                            else:
                                logger.warning(f"Column '{col_name}' not found on model '{model_class.__name__}', skipping for text search.")
                        if or_conditions:
                            query = query.where(or_(*or_conditions))
                    elif hasattr(model_class, field):
                        column_attr = getattr(model_class, field)
                        if operator == "eq":
                            query = query.where(column_attr == value)
                        elif operator == "neq":
                            query = query.where(column_attr != value)
                        elif operator == "gt":
                            query = query.where(column_attr > value)
                        elif operator == "lt":
                            query = query.where(column_attr < value)
                        elif operator == "contains" and isinstance(column_attr.type, (String, Text, VARCHAR)):
                            query = query.where(func.lower(column_attr).contains(str(value).lower()))
                        elif operator == "startswith" and isinstance(column_attr.type, (String, Text, VARCHAR)):
                            query = query.where(func.lower(column_attr).startswith(str(value).lower()))
                        elif operator == "endswith" and isinstance(column_attr.type, (String, Text, VARCHAR)):
                            query = query.where(func.lower(column_attr).endswith(str(value).lower()))
                    else:
                        logger.warning(f"Field '{field}' not found on model or operator '{operator}' not supported for it.")
                
                filtered_subquery = query.distinct().subquery()
                total_query = select(func.count()).select_from(filtered_subquery)

            # 3. Fetch all entities matching the base filters (no pagination yet)
            all_entities_result = await session.execute(query)
            all_entities = all_entities_result.scalars().all()
            
            # 4. Resolve related names to get computed columns
            entity_dicts = [self._model_to_dict(e) for e in all_entities if e]
            resolved_entities = await EntityNameResolver.get_entities_with_related_names(
                session, entity_type, [d for d in entity_dicts if d is not None]
            )

            # 5. In-memory search across all specified columns (including computed)
            final_filtered_entities = resolved_entities
            if search_filter:
                search_value = str(search_filter.get("value", "")).lower()
                search_columns = search_filter.get("field", "").split("search_columns:")[1].split(',')
                
                if search_value:
                    final_filtered_entities = [
                        entity for entity in resolved_entities
                        if any(
                            str(entity.get(col, "")).lower().find(search_value) != -1
                            for col in search_columns if entity.get(col) is not None
                        )
                    ]

            total_count = len(final_filtered_entities)

            # 6. In-memory sorting (if required)
            if sort_field:
                def _sort_key(entity: Dict[str, Any]):
                    value = entity.get(sort_field)
                    if value is None:
                        return ""
                    # Normalize to string for consistent comparison
                    return str(value).lower()

                final_filtered_entities.sort(
                    key=_sort_key,
                    reverse=(str(sort_direction).lower() == "desc")
                )
                
            # 7. Paginate the final list
            start_index = (page - 1) * page_size
            end_index = start_index + page_size
            paginated_entities = final_filtered_entities[start_index:end_index]

            return paginated_entities, total_count
    
    # League methods
    async def get_leagues(self, db: AsyncSession) -> List[League]:
        """Get all leagues."""
        return await self.league_service.get_leagues(db)
    
    async def create_league(self, db: AsyncSession, league: LeagueCreate) -> Optional[League]:
        """Create a new league or update if it already exists."""
        return await self.league_service.create_league(db, league)
    
    async def get_league_by_name(self, db: AsyncSession, name: str) -> Optional[League]:
        """Get a league by name (case-insensitive)."""
        return await self.league_service.get_league_by_name(db, name)
    
    async def get_league(self, db: AsyncSession, league_id: UUID) -> Optional[League]:
        """Get a league by ID."""
        return await self.league_service.get_league(db, league_id)
    
    async def update_league(self, db: AsyncSession, league_id: UUID, league_update: LeagueUpdate) -> Optional[League]:
        """Update a league."""
        return await self.league_service.update_league(db, league_id, league_update)
    
    async def delete_league(self, db: AsyncSession, league_id: UUID) -> bool:
        """Delete a league."""
        return await self.league_service.delete_league(db, league_id)
        
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
    async def get_games(self, db: AsyncSession, league_id: Optional[UUID] = None, team_id: Optional[UUID] = None, season_year: Optional[int] = None) -> List[Game]:
        """Get all games, optionally filtered."""
        return await self.game_service.get_games(db, league_id, team_id, season_year)

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

    # The remaining entity methods would be delegated to their respective services
    # as they are created. For now, we'd keep direct implementations here to maintain
    # the same functionality.
    
    # Entity by name lookup
    async def get_entity_by_name(self, db: AsyncSession, entity_type: str, name: str, league_id: Optional[UUID] = None) -> Optional[dict]:
        """
        Get an entity by name.
        Delegates to specific services or handles special cases like division/conference lookup by league.
        """
        logger.debug(f"[SportsService.get_entity_by_name] Called for entity_type: {entity_type}, name: '{name}', league_id: {league_id}")
        
        # This specific logic for division_conference was causing issues.
        # It's better to handle all lookups through a more generic mechanism if possible,
        # but for now, let's ensure this one is robust.
        if entity_type == 'division_conference':
            try:
                query = select(DivisionConference).where(func.lower(DivisionConference.name) == func.lower(name))
                if league_id:
                    logger.debug(f"Scoping division/conference lookup to league_id: {league_id}")
                    query = query.where(DivisionConference.league_id == league_id)
                
                result = await db.execute(query)
                # Use .all() to detect multiple results for ambiguous names
                div_confs = result.scalars().all()
                
                # If more than one result is found and the query was NOT scoped to a league, it's ambiguous.
                if len(div_confs) > 1 and not league_id:
                    logger.warning(f"Ambiguous lookup for division/conference '{name}' found {len(div_confs)} entries without a league_id scope. Returning None.")
                    return None

                if not div_confs:
                    logger.debug(f"No division/conference found with name '{name}' and league_id '{league_id}'")
                    return None

                div_conf = div_confs[0]
                logger.debug(f"Found division/conference: {div_conf.id}")
                # Direct serialization to avoid issues with the generic _model_to_dict
                return {
                    "id": str(div_conf.id),
                    "league_id": str(div_conf.league_id),
                    "name": div_conf.name,
                    "nickname": div_conf.nickname,
                    "type": div_conf.type,
                    "region": div_conf.region,
                    "description": div_conf.description,
                    "created_at": div_conf.created_at.isoformat() if div_conf.created_at else None,
                    "updated_at": div_conf.updated_at.isoformat() if div_conf.updated_at else None,
                }
            except Exception as e:
                logger.error(f"Error during division_conference lookup: {e}", exc_info=True)
                # Re-raise as a standard exception to be caught by the route handler
                raise

        target_brand_model = None # Used to hold the brand model instance across different logic paths

        if entity_type == 'broadcast_company':
            action_taken = "found" # Default action

            # 1. Try to find an existing Brand with company_type='Broadcaster' and matching name
            exact_broadcaster_query = select(Brand).where(
                (func.lower(Brand.name) == func.lower(name)) &
                (Brand.company_type == "Broadcaster")
            )
            exact_bc_result = await db.execute(exact_broadcaster_query)
            target_brand_model = exact_bc_result.scalars().first()

            if not target_brand_model:
                # 2. Not found as a specific broadcaster, check for an adaptable generic/other brand
                logger.info(f"No exact broadcaster brand found with name '{name}', checking adaptable generic/other brands...")
                adaptable_brand_query = select(Brand).where(
                    (func.lower(Brand.name) == func.lower(name)) &
                    ((Brand.company_type.is_(None)) | (Brand.company_type != "Production Company"))
                )
                adaptable_brand_result = await db.execute(adaptable_brand_query)
                target_brand_model = adaptable_brand_result.scalars().first()

                if target_brand_model:
                    logger.info(f"Found adaptable brand '{target_brand_model.name}' (ID: {target_brand_model.id}, Type: {target_brand_model.company_type}, Industry: {target_brand_model.industry}). Updating to Broadcaster/Broadcasting industry.")
                    needs_commit = False
                    if target_brand_model.company_type != "Broadcaster":
                        target_brand_model.company_type = "Broadcaster"
                        needs_commit = True
                    if target_brand_model.industry != "Broadcasting":
                        target_brand_model.industry = "Broadcasting"
                        needs_commit = True
                    
                    if needs_commit:
                        try:
                            await db.commit()
                            await db.refresh(target_brand_model) # Refresh to get any DB-side changes like updated_at
                            action_taken = "updated_existing"
                            logger.info(f"Successfully updated brand '{target_brand_model.name}' to Broadcaster/Broadcasting industry.")
                        except Exception as e_commit:
                            logger.error(f"Error committing updates to brand {target_brand_model.id} ('{target_brand_model.name}') during broadcast_company lookup: {e_commit}", exc_info=True)
                            await db.rollback()
                            # Fallback: use the brand as is, action remains "found" or a specific error state
                            action_taken = "found_update_failed" 
                    else:
                        # Brand was found and already had correct type and industry
                        action_taken = "found_already_correct"
                else:
                    # 3. No existing brand found at all. Create a new one.
                    logger.info(f"No existing adaptable brand found for '{name}'. Creating new brand as Broadcaster with Broadcasting industry.")
                    try:
                        brand_create_schema = BrandCreate(
                            name=name,
                            industry="Broadcasting",
                            company_type="Broadcaster"
                        )
                        # Ensure brand_service is initialized (it should be from __init__)
                        if not hasattr(self, 'brand_service') or not self.brand_service:
                             logger.critical("CRITICAL: self.brand_service not initialized in SportsService before creating brand!")
                             # This case should ideally not happen if __init__ is correct.
                             # For safety, one might initialize it here, but it points to a larger issue.
                             # self.brand_service = BrandService() # Avoid if possible, ensure __init__
                             # For now, let's assume it's initialized. If not, an AttributeError will occur here, which is informative.
                        
                        created_brand_instance = await self.brand_service.create_brand(db, brand_create_schema)
                        target_brand_model = created_brand_instance # Use the newly created model
                        action_taken = "created_new"
                        logger.info(f"Successfully created new brand '{target_brand_model.name}' (ID: {target_brand_model.id}).")
                    except Exception as e_create:
                        logger.error(f"Error creating new brand for '{name}' during broadcast_company lookup: {e_create}", exc_info=True)
                        # If creation fails, we cannot resolve this broadcast_company name
                        return None # Explicitly return None if creation fails

            # Process the final target_brand_model (whether found, updated, or created)
            if target_brand_model:
                brand_dict = self._model_to_dict(target_brand_model)
                if brand_dict: 
                    brand_dict['_action'] = action_taken
                    # '_is_brand' was used in some previous logic, keeping for potential compatibility if other code relies on it.
                    # However, the entity_type 'broadcast_company' itself implies it's a brand.
                    brand_dict['_is_brand'] = True 
                    return brand_dict
            
            return None # Reached if no brand found and creation also failed or wasn't attempted.
            
        elif entity_type == 'production_company':
            # Try to find a Brand with company_type='Production Company' and matching name
            production_company_query = select(Brand).where(
                (func.lower(Brand.name) == func.lower(name)) &
                (Brand.company_type == "Production Company")
            )
            pc_result = await db.execute(production_company_query)
            production_company = pc_result.scalars().first()
            
            if production_company:
                return self._model_to_dict(production_company)
            
            logger.info(f"No production company brand found with name '{name}', checking generic brands...")
            brand_query = select(Brand).where(
                (func.lower(Brand.name) == func.lower(name)) &
                ((Brand.company_type.is_(None)) | (Brand.company_type != "Broadcaster"))
            )
            brand_result = await db.execute(brand_query)
            brand = brand_result.scalars().first()
            
            if brand:
                logger.info(f"Found brand '{brand.name}' with ID {brand.id}, marking as production company")
                brand_dict = self._model_to_dict(brand)
                if brand_dict:
                    brand_dict['_is_brand'] = True
                    if not brand.company_type:
                        brand.company_type = "Production Company"
                        try:
                            await db.commit()
                        except: # noqa: E722
                            await db.rollback()
                return brand_dict
            return None
            
        elif entity_type == 'brand':
            # This can likely use self.brand_service.get_brand_by_name if such a method exists
            # For now, let's assume the existing direct logic for 'brand' in facade is okay,
            # or refactor it to use self.brand_service.get_entity_by_name if BrandService inherits from BaseEntityService.
            # To ensure consistency, ideally it should call:
            brand_entity = await self.brand_service.get_entity_by_name(db, name, raise_not_found=False)
            return self._model_to_dict(brand_entity) if brand_entity else None

        if entity_type.lower() in ('championship', 'playoff', 'playoffs', 'tournament'):
            # For championships, playoffs, and tournaments, we return a special object with the name and type
            # This is a virtual entity that doesn't have a database table
            logger.info(f"Handling {entity_type} lookup for '{name}'")
            
            # Generate a virtual entity that includes the name
            # This will be converted to a UUID when needed through entity resolution
            return {
                "id": None,  # Will be supplied by client or generated
                "name": name,
                "entity_type": entity_type,
                "_virtual": True  # Flag to indicate this is a virtual entity
            }
        
        # Delegate to specific services for standard entity types
        entity: Optional[Any] = None
        if entity_type == 'league':
            entity = await self.league_service.get_league_by_name(db, name) # Correctly uses LeagueService
        elif entity_type == 'team':
            entity = await self.team_service.get_entity_by_name(db, name) # Assuming TeamService has get_team_by_name
        elif entity_type == 'division_conference':
            # Assuming DivisionConferenceService has get_division_conference_by_name
            division_conference_service = DivisionConferenceService() # Instantiate if not already in self
            entity = await division_conference_service.get_entity_by_name(db, name) # Use get_entity_by_name
        elif entity_type == 'stadium':
            entity = await self.stadium_service.get_entity_by_name(db, name) # Assuming StadiumService has get_stadium_by_name
        # Add other specific entity type delegations here as needed
        # e.g., player, game etc.
        
        else:
            # Fallback to generic model lookup if no specific service handler implemented yet for this path
            # This block should ideally be phased out as specific service methods are used.
            logger.warning(f"[SportsService.get_entity_by_name] No specific service handler for '{entity_type}', using generic model lookup.")
            if entity_type not in self.ENTITY_TYPES:
                raise ValueError(f"Invalid entity type: {entity_type}")
            model_class = self.ENTITY_TYPES[entity_type]
            if not model_class: # Should not happen if ENTITY_TYPES is correct
                 raise ValueError(f"Entity type {entity_type} does not have a dedicated model")

            # This is the problematic part that was only querying by name
            # The specific services (e.g., LeagueService) should now call the enhanced BaseEntityService.get_entity_by_name
            # So, this direct query is redundant if delegation above is comprehensive.
            # If we reach here, it means delegation wasn't set up for this entity_type.
            # For safety, we can call the base method on a temp base service instance if we know the model_class.
            # However, it's better to ensure delegation.
            # For now, let's assume the delegation above will cover the main cases like 'league'.
            # If a type reaches here, it means it's not covered by specific delegation.
            # The old query:
            # query = select(model_class).where(func.lower(model_class.name) == func.lower(name))
            # result = await db.execute(query)
            # entity = result.scalars().first()
            # We should avoid this direct query if possible.
            # If the entity_type is valid and has a service, it should have been handled.
            # If it's a valid type but no explicit service path, we could instantiate a BaseEntityService for it.
            base_service_instance = BaseEntityService(model_class)
            entity = await base_service_instance.get_entity_by_name(db, name, raise_not_found=False)


        if entity:
            entity_dict = self._model_to_dict(entity)
            if entity_dict and entity_type == 'division_conference' and hasattr(entity, 'league_id') and entity.league_id:
                league = await self.league_service.get_league(db, entity.league_id)
                if league:
                    entity_dict['league_name'] = league.name
            return entity_dict
        
        return None
        
    # BroadcastRights methods
    async def get_broadcast_rights(self, db: AsyncSession, entity_type: Optional[str] = None, entity_id: Optional[UUID] = None, company_id: Optional[UUID] = None) -> List[BroadcastRights]:
        """Get all broadcast rights, optionally filtered."""
        broadcast_rights_service = BroadcastRightsService()
        result = await broadcast_rights_service.get_broadcast_rights(db, entity_type=entity_type, entity_id=entity_id, company_id=company_id)
        return result.get("items", [])
    
    async def get_broadcast_right(self, db: AsyncSession, rights_id: UUID) -> Optional[BroadcastRights]:
        """Get broadcast rights by ID."""
        broadcast_rights_service = BroadcastRightsService()
        return await broadcast_rights_service.get_broadcast_right(db, rights_id)
    
    async def update_broadcast_rights(self, db: AsyncSession, rights_id: UUID, rights_update: BroadcastRightsUpdate) -> Optional[BroadcastRights]:
        """Update broadcast rights."""
        broadcast_rights_service = BroadcastRightsService()
        return await broadcast_rights_service.update_broadcast_rights(db, rights_id, rights_update)
    
    async def delete_broadcast_rights(self, db: AsyncSession, rights_id: UUID) -> bool:
        """Delete broadcast rights."""
        broadcast_rights_service = BroadcastRightsService()
        return await broadcast_rights_service.delete_broadcast_rights(db, rights_id)
        
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
        
    # Production Service methods
    async def get_production_services(self, db: AsyncSession, entity_type: Optional[str] = None, entity_id: Optional[UUID] = None, company_id: Optional[UUID] = None) -> List[Dict[str, Any]]:
        """Get all production services, optionally filtered."""
        production_service_service = ProductionServiceService()
        return await production_service_service.get_production_services(db, entity_type=entity_type, entity_id=entity_id, company_id=company_id)
    
    async def create_production_service(self, db: AsyncSession, service: ProductionServiceCreate) -> Dict[str, Any]:
        """Create a new production service."""
        production_service_service = ProductionServiceService()
        return await production_service_service.create_production_service(db, service)
    
    async def get_production_service(self, db: AsyncSession, service_id: UUID) -> Optional[Dict[str, Any]]:
        """Get a production service by ID."""
        production_service_service = ProductionServiceService()
        return await production_service_service.get_production_service(db, service_id)
    
    async def update_production_service(self, db: AsyncSession, service_id: UUID, service_update: ProductionServiceUpdate) -> Optional[Dict[str, Any]]:
        """Update a production service."""
        production_service_service = ProductionServiceService()
        return await production_service_service.update_production_service(db, service_id, service_update)
    
    async def delete_production_service(self, db: AsyncSession, service_id: UUID) -> bool:
        """Delete a production service."""
        production_service_service = ProductionServiceService()
        return await production_service_service.delete_production_service(db, service_id)
    
    # Brand Relationship methods have been removed
    # This functionality has been integrated into the Brand model with partner fields