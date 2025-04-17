from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Dict, List, Any, Optional, Type
from uuid import UUID
import logging

from src.models.sports_models import (
    League, Team, Player, Game, Stadium, 
    BroadcastRights, ProductionService,
    Brand, GameBroadcast, LeagueExecutive,
    DivisionConference
)

logger = logging.getLogger(__name__)

# Entity type mapping for lookup
ENTITY_TYPES = {
    # Plural forms
    "leagues": League,
    "teams": Team,
    "players": Player,
    "games": Game,
    "stadiums": Stadium,
    "broadcast_companies": Brand,  # Now using Brand with company_type='Broadcaster'
    "broadcast_rights": BroadcastRights,
    "production_companies": Brand,  # Now using Brand with company_type='Production Company'
    "production_services": ProductionService,
    "brands": Brand,
    "game_broadcasts": GameBroadcast,
    "league_executives": LeagueExecutive,
    "divisions_conferences": DivisionConference,
    # Singular forms
    "league": League,
    "team": Team,
    "player": Player,
    "game": Game,
    "stadium": Stadium,
    "broadcast_company": Brand,  # Now using Brand with company_type='Broadcaster'
    "broadcast_right": BroadcastRights,
    "production_company": Brand,  # Now using Brand with company_type='Production Company'
    "production_service": ProductionService,
    "brand": Brand,
    "game_broadcast": GameBroadcast,
    "league_executive": LeagueExecutive,
    "division_conference": DivisionConference,
    # Additional mappings for frontend entity types
    "broadcast": BroadcastRights,
    "production": ProductionService,
    # Racing-specific entity types (mapped to League)
    "racing_series": League,
    "racing series": League,
    "racing": League,
    "series": League,
    # Special entity types (handled through mapping)
    "championship": None,  # Handled in validator
    "playoff": None,       # Handled in validator
    "playoffs": None,      # Handled in validator
    "tournament": None     # Handled in validator
}

def normalize_entity_type(entity_type: str) -> str:
    """
    Standardize entity type strings.
    
    Examples:
        'division' or 'conference' -> 'division_conference'
        'broadcast_right' -> 'broadcast_rights' 
        'Team' -> 'team'
        'Racing Series' or 'racing' -> 'league'
    """
    if not entity_type:
        return ""
    
    # Convert to lowercase and remove any trailing 's'
    normalized = entity_type.lower()
    
    # Handle specific mappings
    if normalized in ['division', 'conference']:
        return 'division_conference'
    elif normalized == 'broadcast':
        return 'broadcast_rights'
    elif normalized == 'production':
        return 'production_services'
    elif normalized in ['championship', 'playoff', 'playoffs', 'tournament']:
        return normalized  # Keep these as is for special handling
    
    # Handle racing series and variations
    elif 'racing' in normalized or 'series' in normalized:
        logger.info(f"Normalizing racing entity type: {entity_type} -> league")
        return 'league'
    
    # Check if it's a valid entity type (handles pluralization)
    if normalized in ENTITY_TYPES:
        # Return the normalized form based on the model class name
        model_class = ENTITY_TYPES[normalized]
        if model_class:
            return model_class.__name__.lower()
        return normalized
    
    # Handle plural forms not in the mapping
    if normalized.endswith('s') and normalized[:-1] in ENTITY_TYPES:
        model_class = ENTITY_TYPES[normalized[:-1]]
        if model_class:
            return model_class.__name__.lower()
    
    # Return as is if we can't normalize it
    return entity_type

def get_model_for_entity_type(entity_type: str) -> Optional[Type]:
    """Get the model class for a given entity type string."""
    # First try with the provided entity type
    if entity_type in ENTITY_TYPES:
        return ENTITY_TYPES.get(entity_type)
    
    # If not found, try normalizing the entity type
    normalized = normalize_entity_type(entity_type)
    return ENTITY_TYPES.get(normalized)
    
async def get_entity_name(db: AsyncSession, entity_type: str, entity_id: UUID) -> Optional[str]:
    """Get the name of an entity by its type and ID."""
    model_class = get_model_for_entity_type(entity_type)
    if not model_class or not hasattr(model_class, 'name'):
        return None
        
    result = await db.execute(select(model_class.name).where(model_class.id == entity_id))
    return result.scalar()

async def get_game_display_name(db: AsyncSession, game_id: UUID) -> str:
    """Get a readable name for a game (home team vs away team)."""
    result = await db.execute(
        select(Game, Team.name.label("home_team_name"))
        .join(Team, Game.home_team_id == Team.id)
        .where(Game.id == game_id)
    )
    game_record = result.first()
    
    if not game_record:
        return f"Game {game_id}"
        
    game = game_record[0]
    home_team_name = game_record[1]
    away_team_result = await db.execute(select(Team.name).where(Team.id == game.away_team_id))
    away_team_name = away_team_result.scalar()
    
    return f"{home_team_name} vs {away_team_name}"

async def validate_entity_relationship(db: AsyncSession, parent_type: str, parent_id: UUID, 
                                      child_type: str, child_id: UUID) -> bool:
    """
    Validate that a child entity belongs to a parent entity.
    For example, check if a team (child) belongs to a league (parent).
    """
    # Handle specific relationship validations
    if parent_type == 'league' and child_type == 'team':
        result = await db.execute(select(Team).where(
            (Team.id == child_id) & (Team.league_id == parent_id)
        ))
        return result.scalars().first() is not None
        
    elif parent_type == 'league' and child_type == 'division_conference':
        result = await db.execute(select(DivisionConference).where(
            (DivisionConference.id == child_id) & (DivisionConference.league_id == parent_id)
        ))
        return result.scalars().first() is not None
        
    elif parent_type == 'team' and child_type == 'player':
        result = await db.execute(select(Player).where(
            (Player.id == child_id) & (Player.team_id == parent_id)
        ))
        return result.scalars().first() is not None
        
    # Add more relationship validations as needed
    
    return False
