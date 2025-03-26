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
        self.stadium_service = StadiumService()
        # These will be added as the individual services are created
        # self.player_service = PlayerService()
        # self.game_service = GameService()
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
    
    # The remaining entity methods would be delegated to their respective services
    # as they are created. For now, we'd keep direct implementations here to maintain
    # the same functionality.
    
    # Entity by name lookup
    async def get_entity_by_name(self, db: AsyncSession, entity_type: str, name: str) -> Optional[dict]:
        """
        Get an entity by name.
        
        For broadcast_company and production_company entity types, if not found with the given name,
        will also attempt to look up a brand with the same name as a fallback.
        """
        # Handle special case for broadcast_company
        if entity_type == 'broadcast_company':
            # First try to find a broadcast company with this name
            broadcast_company_query = select(BroadcastCompany).where(
                func.lower(BroadcastCompany.name) == func.lower(name)
            )
            bc_result = await db.execute(broadcast_company_query)
            broadcast_company = bc_result.scalars().first()
            
            if broadcast_company:
                # Found a broadcast company, convert to dict and return
                return self._model_to_dict(broadcast_company)
            
            # No broadcast company found, try looking up a brand instead
            logger.info(f"No broadcast company found with name '{name}', checking brands...")
            brand_query = select(Brand).where(func.lower(Brand.name) == func.lower(name))
            brand_result = await db.execute(brand_query)
            brand = brand_result.scalars().first()
            
            if brand:
                # Found a brand, convert to a broadcast company-like dict
                logger.info(f"Found brand '{brand.name}' with ID {brand.id}, returning as broadcast company")
                brand_dict = self._model_to_dict(brand)
                
                # Add a special field to indicate this is actually a brand
                brand_dict['_is_brand'] = True
                
                # Set company type if not already set
                if not brand.company_type:
                    brand.company_type = "Broadcaster"
                    try:
                        await db.commit()
                    except:
                        await db.rollback()
                
                return brand_dict
            
            # Neither broadcast company nor brand found
            return None
            
        # Handle special case for production_company
        elif entity_type == 'production_company':
            # First try to find a production company with this name
            production_company_query = select(ProductionCompany).where(
                func.lower(ProductionCompany.name) == func.lower(name)
            )
            pc_result = await db.execute(production_company_query)
            production_company = pc_result.scalars().first()
            
            if production_company:
                # Found a production company, convert to dict and return
                return self._model_to_dict(production_company)
            
            # No production company found, try looking up a brand instead
            logger.info(f"No production company found with name '{name}', checking brands...")
            brand_query = select(Brand).where(func.lower(Brand.name) == func.lower(name))
            brand_result = await db.execute(brand_query)
            brand = brand_result.scalars().first()
            
            if brand:
                # Found a brand, convert to a production company-like dict
                logger.info(f"Found brand '{brand.name}' with ID {brand.id}, returning as production company")
                brand_dict = self._model_to_dict(brand)
                
                # Add a special field to indicate this is actually a brand
                brand_dict['_is_brand'] = True
                
                # Set company type if not already set
                if not brand.company_type:
                    brand.company_type = "Production Company"
                    try:
                        await db.commit()
                    except:
                        await db.rollback()
                
                return brand_dict
            
            # Neither production company nor brand found
            return None
            
        # If entity_type is 'brand', look for any company
        elif entity_type == 'brand':
            # Try to find a brand directly
            brand_query = select(Brand).where(func.lower(Brand.name) == func.lower(name))
            brand_result = await db.execute(brand_query)
            brand = brand_result.scalars().first()
            
            if brand:
                return self._model_to_dict(brand)
                
            # Try broadcast company
            broadcast_query = select(BroadcastCompany).where(func.lower(BroadcastCompany.name) == func.lower(name))
            broadcast_result = await db.execute(broadcast_query)
            broadcast = broadcast_result.scalars().first()
            
            if broadcast:
                logger.info(f"Found broadcast company '{broadcast.name}', creating brand")
                # Create a brand from this broadcast company
                brand_service = BrandService()
                brand = await brand_service.create_broadcast_company(db, {
                    "name": broadcast.name,
                    "industry": "Media",
                    "country": broadcast.country
                })
                return self._model_to_dict(brand)
                
            # Try production company
            production_query = select(ProductionCompany).where(func.lower(ProductionCompany.name) == func.lower(name))
            production_result = await db.execute(production_query)
            production = production_result.scalars().first()
            
            if production:
                logger.info(f"Found production company '{production.name}', creating brand")
                # Create a brand from this production company
                brand_service = BrandService()
                brand = await brand_service.create_production_company(db, {
                    "name": production.name,
                    "industry": "Production"
                })
                return self._model_to_dict(brand)
                
            return None
        
        # Handle special entity types
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
        
        # Handle all other entity types normally
        if entity_type not in self.ENTITY_TYPES:
            raise ValueError(f"Invalid entity type: {entity_type}")
        
        model_class = self.ENTITY_TYPES[entity_type]
        if model_class is None:
            raise ValueError(f"Entity type {entity_type} does not have a dedicated model")
        
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
        
    # BroadcastRights methods
    async def get_broadcast_rights(self, db: AsyncSession, entity_type: Optional[str] = None, entity_id: Optional[UUID] = None, company_id: Optional[UUID] = None) -> List[BroadcastRights]:
        """Get all broadcast rights, optionally filtered."""
        broadcast_rights_service = BroadcastRightsService()
        return await broadcast_rights_service.get_broadcast_rights(db, entity_type, entity_id, company_id)
    
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
    async def get_production_services(self, db: AsyncSession, entity_type: Optional[str] = None, entity_id: Optional[UUID] = None, company_id: Optional[UUID] = None) -> List[ProductionService]:
        """Get all production services, optionally filtered."""
        production_service_service = ProductionServiceService()
        return await production_service_service.get_production_services(db, entity_type, entity_id, company_id)
    
    async def create_production_service(self, db: AsyncSession, service: ProductionServiceCreate) -> ProductionService:
        """Create a new production service."""
        production_service_service = ProductionServiceService()
        return await production_service_service.create_production_service(db, service)
    
    async def get_production_service(self, db: AsyncSession, service_id: UUID) -> Optional[ProductionService]:
        """Get a production service by ID."""
        production_service_service = ProductionServiceService()
        return await production_service_service.get_production_service(db, service_id)
    
    async def update_production_service(self, db: AsyncSession, service_id: UUID, service_update: ProductionServiceUpdate) -> Optional[ProductionService]:
        """Update a production service."""
        production_service_service = ProductionServiceService()
        return await production_service_service.update_production_service(db, service_id, service_update)
    
    async def delete_production_service(self, db: AsyncSession, service_id: UUID) -> bool:
        """Delete a production service."""
        production_service_service = ProductionServiceService()
        return await production_service_service.delete_production_service(db, service_id)
    
    # Brand Relationship methods
    async def get_brand_relationships(self, db: AsyncSession, brand_id: Optional[UUID] = None, entity_type: Optional[str] = None, entity_id: Optional[UUID] = None, relationship_type: Optional[str] = None) -> List[BrandRelationship]:
        """Get all brand relationships, optionally filtered."""
        brand_relationship_service = BrandRelationshipService()
        return await brand_relationship_service.get_brand_relationships(db, brand_id, entity_type, entity_id)
    
    async def create_brand_relationship(self, db: AsyncSession, relationship: BrandRelationshipCreate) -> BrandRelationship:
        """Create a new brand relationship."""
        brand_relationship_service = BrandRelationshipService()
        return await brand_relationship_service.create_brand_relationship(db, relationship)
    
    async def get_brand_relationship(self, db: AsyncSession, relationship_id: UUID) -> Optional[BrandRelationship]:
        """Get a brand relationship by ID."""
        brand_relationship_service = BrandRelationshipService()
        return await brand_relationship_service.get_brand_relationship(db, relationship_id)
    
    async def update_brand_relationship(self, db: AsyncSession, relationship_id: UUID, relationship_update: BrandRelationshipUpdate) -> Optional[BrandRelationship]:
        """Update a brand relationship."""
        brand_relationship_service = BrandRelationshipService()
        return await brand_relationship_service.update_brand_relationship(db, relationship_id, relationship_update)
    
    async def delete_brand_relationship(self, db: AsyncSession, relationship_id: UUID) -> bool:
        """Delete a brand relationship."""
        brand_relationship_service = BrandRelationshipService()
        return await brand_relationship_service.delete_brand_relationship(db, relationship_id)