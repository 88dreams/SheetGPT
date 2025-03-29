from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
from typing import Dict, Any, Optional, List, Tuple, Set, TypeVar, Union
from uuid import UUID, uuid5, NAMESPACE_OID
import logging
import re
from difflib import SequenceMatcher

from src.models.sports_models import (
    League, Team, Player, Game, Stadium, 
    BroadcastCompany, BroadcastRights, 
    ProductionCompany, ProductionService,
    Brand, BrandRelationship,
    GameBroadcast, LeagueExecutive,
    DivisionConference
)
from src.services.sports.utils import normalize_entity_type, get_model_for_entity_type

logger = logging.getLogger(__name__)

# Type variable for generic entity types
T = TypeVar('T')

# Define resolution path configurations
RESOLUTION_PATHS = {
    "league": ["league"],
    "team": ["team"],
    "player": ["player"],
    "game": ["game"],
    "stadium": ["stadium"],
    "broadcast_company": ["broadcast_company", "brand"],
    "production_company": ["production_company", "brand"],
    "brand": ["brand", "broadcast_company", "production_company"],
    "broadcast_rights": ["broadcast_rights"],
    "production_service": ["production_service"],
    "game_broadcast": ["game_broadcast"],
    "league_executive": ["league_executive"],
    "division_conference": ["division_conference"],
    "division": ["division_conference"],
    "conference": ["division_conference"],
    "championship": ["championship"],  # Virtual entity
    "playoff": ["playoff"],           # Virtual entity
    "playoffs": ["playoff"],           # Virtual entity
    "tournament": ["tournament"]      # Virtual entity
}

# Define related entity types for context-aware resolution
RELATED_ENTITY_TYPES = {
    "league": ["division_conference", "team", "league_executive", "broadcast_rights", "production_service"],
    "team": ["league", "division_conference", "player", "stadium", "broadcast_rights", "production_service"],
    "player": ["team"],
    "stadium": ["team"],
    "division_conference": ["league", "team"],
    "broadcast_rights": ["league", "team", "division_conference", "game"],
    "production_service": ["league", "team", "division_conference", "game"],
    "game": ["league", "team", "stadium", "game_broadcast"],
    "game_broadcast": ["game", "broadcast_company", "production_company"],
    "league_executive": ["league"]
}

# Define special virtual entity types
VIRTUAL_ENTITY_TYPES = {"championship", "playoff", "playoffs", "tournament"}

class EntityResolutionError(Exception):
    """Exception raised for entity resolution errors."""
    
    def __init__(self, message: str, entity_type: str, name: str, context: Optional[Dict[str, Any]] = None):
        self.message = message
        self.entity_type = entity_type
        self.name = name
        self.context = context or {}
        super().__init__(self.message)
        
    def to_dict(self) -> Dict[str, Any]:
        """Convert the error to a dictionary for API responses."""
        return {
            "error": "entity_resolution_error",
            "message": self.message,
            "entity_type": self.entity_type,
            "name": self.name,
            "context": self.context
        }

class EntityResolver:
    """
    Enhanced entity resolver with improved name matching and fallback strategies.
    
    This class centralizes all entity resolution logic with features:
    - Fuzzy name matching with configurable threshold
    - Multiple resolution strategies (exact, case-insensitive, fuzzy)
    - Configurable resolution paths with fallbacks
    - Special handling for virtual entity types
    - Standardized error handling and reporting
    - Context-aware resolution using related entities
    """
    
    def __init__(self, fuzzy_threshold: float = 0.8):
        """
        Initialize the resolver with a configurable fuzzy matching threshold.
        
        Args:
            fuzzy_threshold: Similarity threshold for fuzzy matching (0.0 to 1.0)
        """
        self.fuzzy_threshold = fuzzy_threshold
        
    async def resolve_entity(
        self, 
        db: AsyncSession, 
        entity_type: str, 
        name_or_id: Union[str, UUID],
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Resolve an entity by name or ID with smart fallback and fuzzy matching.
        
        Args:
            db: Database session
            entity_type: The entity type to resolve
            name_or_id: Entity name or ID
            context: Optional context for resolution (related entities, etc.)
            
        Returns:
            The resolved entity as a dictionary
            
        Raises:
            EntityResolutionError: If entity resolution fails
        """
        # If name_or_id is UUID, do a direct ID lookup first
        if isinstance(name_or_id, UUID) or (isinstance(name_or_id, str) and self._is_valid_uuid(name_or_id)):
            entity_id = name_or_id if isinstance(name_or_id, UUID) else UUID(name_or_id)
            entity = await self._resolve_by_id(db, entity_type, entity_id)
            if entity:
                return entity
                
        # Handle as a name lookup if it's a string
        if isinstance(name_or_id, str):
            # Normalize entity type for consistent handling
            normalized_type = normalize_entity_type(entity_type)
            
            # Get resolution path for this entity type
            resolution_path = RESOLUTION_PATHS.get(normalized_type, [normalized_type])
            
            # Try each entity type in the resolution path
            for resolution_type in resolution_path:
                # Handle virtual entity types specially
                if resolution_type in VIRTUAL_ENTITY_TYPES:
                    virtual_entity = self._create_virtual_entity(resolution_type, name_or_id)
                    return virtual_entity
                
                # Try exact, case-insensitive, and fuzzy matching in sequence
                resolved_entity = await self._resolve_by_name_exact(db, resolution_type, name_or_id)
                if resolved_entity:
                    # Add metadata about resolution path if it wasn't the primary type
                    if resolution_type != normalized_type:
                        resolved_entity["_resolved_via"] = resolution_type
                    return resolved_entity
                
                resolved_entity = await self._resolve_by_name_case_insensitive(db, resolution_type, name_or_id)
                if resolved_entity:
                    # Add metadata about resolution path if it wasn't the primary type
                    if resolution_type != normalized_type:
                        resolved_entity["_resolved_via"] = resolution_type
                    return resolved_entity
                
                resolved_entity = await self._resolve_by_name_fuzzy(db, resolution_type, name_or_id)
                if resolved_entity:
                    # Add metadata about resolution and confidence
                    if resolution_type != normalized_type:
                        resolved_entity["_resolved_via"] = resolution_type
                    return resolved_entity
            
            # If we have context, try context-aware resolution as a last resort
            if context:
                context_resolved = await self._resolve_with_context(db, normalized_type, name_or_id, context)
                if context_resolved:
                    return context_resolved
        
        # If we get here, resolution failed
        raise EntityResolutionError(
            message=f"Could not resolve {entity_type} with identifier: {name_or_id}",
            entity_type=entity_type,
            name=str(name_or_id),
            context={"resolution_path": RESOLUTION_PATHS.get(normalize_entity_type(entity_type), [entity_type])}
        )
    
    async def resolve_entities(
        self, 
        db: AsyncSession, 
        entity_type: str, 
        names_or_ids: List[Union[str, UUID]],
        context: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Resolve multiple entities by name or ID.
        
        Args:
            db: Database session
            entity_type: The entity type to resolve
            names_or_ids: List of entity names or IDs
            context: Optional context for resolution (related entities, etc.)
            
        Returns:
            List of resolved entities as dictionaries
            
        Raises:
            EntityResolutionError: If any entity resolution fails
        """
        resolved_entities = []
        resolution_errors = []
        
        for name_or_id in names_or_ids:
            try:
                entity = await self.resolve_entity(db, entity_type, name_or_id, context)
                resolved_entities.append(entity)
            except EntityResolutionError as e:
                resolution_errors.append(e.to_dict())
        
        if resolution_errors:
            # If all resolutions failed, raise an error
            if len(resolution_errors) == len(names_or_ids):
                raise EntityResolutionError(
                    message=f"Failed to resolve any {entity_type} entities",
                    entity_type=entity_type,
                    name=str(names_or_ids),
                    context={"errors": resolution_errors}
                )
            # Otherwise, log warnings but return the ones that succeeded
            for error in resolution_errors:
                logger.warning(f"Entity resolution warning: {error['message']}")
        
        return resolved_entities
    
    async def resolve_entity_reference(
        self, 
        db: AsyncSession, 
        entity_type: str, 
        name_or_id: Union[str, UUID],
        context: Optional[Dict[str, Any]] = None
    ) -> UUID:
        """
        Resolve an entity to just its ID, useful for foreign key references.
        
        Args:
            db: Database session
            entity_type: The entity type to resolve
            name_or_id: Entity name or ID
            context: Optional context for resolution (related entities, etc.)
            
        Returns:
            The resolved entity's UUID
            
        Raises:
            EntityResolutionError: If entity resolution fails
        """
        # If it's already a UUID, validate it exists
        if isinstance(name_or_id, UUID) or (isinstance(name_or_id, str) and self._is_valid_uuid(name_or_id)):
            entity_id = name_or_id if isinstance(name_or_id, UUID) else UUID(name_or_id)
            exists = await self._validate_entity_exists(db, entity_type, entity_id)
            
            if exists:
                return entity_id
                
            # For virtual entity types, always return a deterministic UUID
            normalized_type = normalize_entity_type(entity_type)
            if normalized_type in VIRTUAL_ENTITY_TYPES:
                return self._generate_virtual_entity_id(normalized_type, str(name_or_id))
                
        # Otherwise resolve the full entity and return its ID
        entity = await self.resolve_entity(db, entity_type, name_or_id, context)
        
        # Handle special case for virtual entities
        if '_virtual' in entity and entity['_virtual']:
            entity_name = entity.get('name', str(name_or_id))
            virtual_type = entity.get('entity_type', entity_type)
            return self._generate_virtual_entity_id(virtual_type, entity_name)
            
        return entity['id']
    
    def _model_to_dict(self, model: Any) -> Dict[str, Any]:
        """Convert a model instance to a dictionary."""
        result = {}
        # Get the columns defined in this model's table
        for column in model.__table__.columns:
            result[column.name] = getattr(model, column.name)
        return result
    
    def _standardize_name(self, name: str) -> str:
        """
        Standardize a name for improved matching.
        
        - Converts to lowercase
        - Removes extra whitespace
        - Removes special characters
        - Handles common abbreviations
        """
        if not name:
            return ""
            
        # Convert to lowercase
        result = name.lower()
        
        # Replace multiple spaces with a single space
        result = re.sub(r'\s+', ' ', result)
        
        # Remove special characters (keep spaces, letters, numbers)
        result = re.sub(r'[^\w\s]', '', result)
        
        # Handle common abbreviations and alternate forms
        replacements = {
            "united states": "usa",
            "united states of america": "usa",
            "national football league": "nfl",
            "national basketball association": "nba",
            "major league baseball": "mlb",
            "national hockey league": "nhl",
            "major league soccer": "mls",
            "fc": "football club",
            "sc": "soccer club",
            "ac": "athletic club",
            "united": "utd",
        }
        
        for original, replacement in replacements.items():
            # Replace as whole words only with word boundaries
            result = re.sub(r'\b' + re.escape(original) + r'\b', replacement, result)
            
        # Remove leading/trailing whitespace
        return result.strip()
    
    def _calculate_name_similarity(self, name1: str, name2: str) -> float:
        """
        Calculate similarity between two names using sequence matcher.
        
        Returns:
            Float from 0.0 to 1.0 representing similarity
        """
        if not name1 or not name2:
            return 0.0
            
        # Standardize names first
        std_name1 = self._standardize_name(name1)
        std_name2 = self._standardize_name(name2)
        
        # Return exact match immediately
        if std_name1 == std_name2:
            return 1.0
            
        # Calculate similarity
        matcher = SequenceMatcher(None, std_name1, std_name2)
        return matcher.ratio()
    
    def _is_valid_uuid(self, uuid_str: str) -> bool:
        """Check if a string is a valid UUID."""
        try:
            UUID(uuid_str)
            return True
        except ValueError:
            return False
    
    def _create_virtual_entity(self, entity_type: str, name: str) -> Dict[str, Any]:
        """
        Create a virtual entity for special types that don't have database tables.
        
        Args:
            entity_type: The virtual entity type (championship, playoff, tournament)
            name: Entity name
            
        Returns:
            A dictionary representing the virtual entity
        """
        entity_id = self._generate_virtual_entity_id(entity_type, name)
        
        return {
            "id": entity_id,
            "name": name,
            "entity_type": entity_type,
            "_virtual": True
        }
    
    def _generate_virtual_entity_id(self, entity_type: str, name: str) -> UUID:
        """
        Generate a deterministic UUID for virtual entities based on type and name.
        
        This ensures the same virtual entity always gets the same UUID.
        
        Args:
            entity_type: The virtual entity type
            name: Entity name
            
        Returns:
            A deterministic UUID
        """
        # Standardize the name for consistency
        std_name = self._standardize_name(name)
        
        # Create a namespaced UUID using entity type and standardized name
        seed = f"{entity_type.lower()}:{std_name}"
        return uuid5(NAMESPACE_OID, seed)
    
    async def _validate_entity_exists(self, db: AsyncSession, entity_type: str, entity_id: UUID) -> bool:
        """Check if an entity with the given ID exists."""
        normalized_type = normalize_entity_type(entity_type)
        
        # Handle virtual entity types
        if normalized_type in VIRTUAL_ENTITY_TYPES:
            return True
            
        model_class = get_model_for_entity_type(normalized_type)
        if not model_class:
            return False
            
        # Query for the ID
        result = await db.execute(
            select(model_class.id).where(model_class.id == entity_id)
        )
        return result.scalar() is not None
    
    async def _resolve_by_id(self, db: AsyncSession, entity_type: str, entity_id: UUID) -> Optional[Dict[str, Any]]:
        """Resolve an entity by its ID."""
        normalized_type = normalize_entity_type(entity_type)
        
        # Handle virtual entity types (they don't have database tables)
        if normalized_type in VIRTUAL_ENTITY_TYPES:
            # For virtual entities, we can't lookup by ID directly
            # but we can create a placeholder entity
            return self._create_virtual_entity(normalized_type, f"{normalized_type.capitalize()} {entity_id}")
            
        model_class = get_model_for_entity_type(normalized_type)
        if not model_class:
            return None
            
        result = await db.execute(
            select(model_class).where(model_class.id == entity_id)
        )
        entity = result.scalars().first()
        
        if entity:
            return self._model_to_dict(entity)
            
        return None
    
    async def _resolve_by_name_exact(self, db: AsyncSession, entity_type: str, name: str) -> Optional[Dict[str, Any]]:
        """Resolve an entity by exact name match."""
        normalized_type = normalize_entity_type(entity_type)
        
        # Handle virtual entity types
        if normalized_type in VIRTUAL_ENTITY_TYPES:
            return self._create_virtual_entity(normalized_type, name)
            
        model_class = get_model_for_entity_type(normalized_type)
        if not model_class:
            return None
            
        # Special handling for brand/company lookup
        if normalized_type in ['broadcast_company', 'production_company'] and not hasattr(model_class, 'name'):
            # These might be implemented using brands now
            brand_result = await db.execute(
                select(Brand).where(Brand.name == name)
            )
            brand = brand_result.scalars().first()
            
            if brand:
                brand_dict = self._model_to_dict(brand)
                brand_dict['_is_brand'] = True
                return brand_dict
                
        # Regular exact match lookup
        if hasattr(model_class, 'name'):
            result = await db.execute(
                select(model_class).where(model_class.name == name)
            )
            entity = result.scalars().first()
            
            if entity:
                return self._model_to_dict(entity)
                
        return None
    
    async def _resolve_by_name_case_insensitive(self, db: AsyncSession, entity_type: str, name: str) -> Optional[Dict[str, Any]]:
        """Resolve an entity by case-insensitive name match."""
        normalized_type = normalize_entity_type(entity_type)
        
        # Handle virtual entity types
        if normalized_type in VIRTUAL_ENTITY_TYPES:
            return self._create_virtual_entity(normalized_type, name)
            
        model_class = get_model_for_entity_type(normalized_type)
        if not model_class:
            return None
            
        # Special handling for brand/company lookup
        if normalized_type in ['broadcast_company', 'production_company'] and not hasattr(model_class, 'name'):
            # These might be implemented using brands now
            brand_result = await db.execute(
                select(Brand).where(func.lower(Brand.name) == func.lower(name))
            )
            brand = brand_result.scalars().first()
            
            if brand:
                brand_dict = self._model_to_dict(brand)
                brand_dict['_is_brand'] = True
                return brand_dict
                
        # Regular case-insensitive match lookup
        if hasattr(model_class, 'name'):
            result = await db.execute(
                select(model_class).where(func.lower(model_class.name) == func.lower(name))
            )
            entity = result.scalars().first()
            
            if entity:
                return self._model_to_dict(entity)
                
        return None
    
    async def _resolve_by_name_fuzzy(self, db: AsyncSession, entity_type: str, name: str) -> Optional[Dict[str, Any]]:
        """
        Resolve an entity by fuzzy name matching.
        
        This uses the fuzzy_threshold to determine acceptable matches.
        """
        normalized_type = normalize_entity_type(entity_type)
        
        # Handle virtual entity types
        if normalized_type in VIRTUAL_ENTITY_TYPES:
            return self._create_virtual_entity(normalized_type, name)
            
        model_class = get_model_for_entity_type(normalized_type)
        if not model_class or not hasattr(model_class, 'name'):
            return None
            
        # Get all entities of this type
        result = await db.execute(select(model_class))
        entities = result.scalars().all()
        
        # Find the best fuzzy match
        best_match = None
        best_score = 0.0
        
        for entity in entities:
            entity_name = getattr(entity, 'name', '')
            score = self._calculate_name_similarity(name, entity_name)
            
            if score > best_score and score >= self.fuzzy_threshold:
                best_score = score
                best_match = entity
        
        if best_match:
            entity_dict = self._model_to_dict(best_match)
            entity_dict['_match_score'] = best_score
            entity_dict['_fuzzy_matched'] = True
            return entity_dict
            
        return None
    
    async def _resolve_with_context(
        self, 
        db: AsyncSession, 
        entity_type: str, 
        name: str, 
        context: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """
        Context-aware entity resolution using related entity information.
        
        This performs more sophisticated lookups when regular resolution fails.
        
        Args:
            db: Database session
            entity_type: The entity type to resolve
            name: Entity name
            context: Context containing related entity info
            
        Returns:
            The resolved entity or None if resolution fails
        """
        normalized_type = normalize_entity_type(entity_type)
        
        # Special case for team resolution by league
        if normalized_type == 'team' and 'league_id' in context:
            league_id = context['league_id']
            
            # Try a fuzzy search for teams in this league
            result = await db.execute(
                select(Team).where(Team.league_id == league_id)
            )
            teams = result.scalars().all()
            
            best_match = None
            best_score = 0.0
            
            for team in teams:
                score = self._calculate_name_similarity(name, team.name)
                
                if score > best_score and score >= self.fuzzy_threshold:
                    best_score = score
                    best_match = team
            
            if best_match:
                entity_dict = self._model_to_dict(best_match)
                entity_dict['_match_score'] = best_score
                entity_dict['_context_matched'] = True
                entity_dict['_context_type'] = 'league'
                return entity_dict
        
        # Special case for division resolution by league        
        if normalized_type == 'division_conference' and 'league_id' in context:
            league_id = context['league_id']
            
            # Try a fuzzy search for divisions in this league
            result = await db.execute(
                select(DivisionConference).where(DivisionConference.league_id == league_id)
            )
            divisions = result.scalars().all()
            
            best_match = None
            best_score = 0.0
            
            for division in divisions:
                score = self._calculate_name_similarity(name, division.name)
                
                if score > best_score and score >= self.fuzzy_threshold:
                    best_score = score
                    best_match = division
            
            if best_match:
                entity_dict = self._model_to_dict(best_match)
                entity_dict['_match_score'] = best_score
                entity_dict['_context_matched'] = True
                entity_dict['_context_type'] = 'league'
                return entity_dict
        
        # Special case for player resolution by team        
        if normalized_type == 'player' and 'team_id' in context:
            team_id = context['team_id']
            
            # Try a fuzzy search for players on this team
            result = await db.execute(
                select(Player).where(Player.team_id == team_id)
            )
            players = result.scalars().all()
            
            best_match = None
            best_score = 0.0
            
            for player in players:
                score = self._calculate_name_similarity(name, player.name)
                
                if score > best_score and score >= self.fuzzy_threshold:
                    best_score = score
                    best_match = player
            
            if best_match:
                entity_dict = self._model_to_dict(best_match)
                entity_dict['_match_score'] = best_score
                entity_dict['_context_matched'] = True
                entity_dict['_context_type'] = 'team'
                return entity_dict
                
        return None