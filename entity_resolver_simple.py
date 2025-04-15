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
    Brand, GameBroadcast, LeagueExecutive,
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
                    if resolution_type \!= normalized_type:
                        resolved_entity["_resolved_via"] = resolution_type
                    return resolved_entity
                
                resolved_entity = await self._resolve_by_name_case_insensitive(db, resolution_type, name_or_id)
                if resolved_entity:
                    # Add metadata about resolution path if it wasn't the primary type
                    if resolution_type \!= normalized_type:
                        resolved_entity["_resolved_via"] = resolution_type
                    return resolved_entity
                
                resolved_entity = await self._resolve_by_name_fuzzy(db, resolution_type, name_or_id)
                if resolved_entity:
                    # Add metadata about resolution and confidence
                    if resolution_type \!= normalized_type:
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
