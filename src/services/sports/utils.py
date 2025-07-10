from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Dict, List, Any, Optional, Type
from uuid import UUID
import logging

from src.models.sports_models import (
    League, Team, Player, Game, Stadium, 
    BroadcastRights, ProductionService,
    Brand, GameBroadcast, LeagueExecutive,
    DivisionConference, Creator, Management
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
    "creators": Creator,
    "managements": Management,
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
    "creator": Creator,
    "management": Management,
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
    """Standardizes entity type strings to match internal conventions."""
    type_map = {
        "leagues": "league",
        "divisions_conferences": "division_conference",
        "division_conference": "division_conference", # Explicitly handle this case
        "teams": "team",
        "players": "player",
        "games": "game",
        "stadiums": "stadium",
        "broadcast_companies": "broadcast_company",
        "broadcast_rights": "broadcast_right",
        "production_companies": "production_company",
        "production_services": "production_service",
        "brands": "brand",
        "game_broadcasts": "game_broadcast",
        "league_executives": "league_executive",
        "brand_relationships": "brand_relationship",
        "contacts": "contact"
    }
    
    # First, check for an exact match in our mapping
    if entity_type in type_map:
        return type_map[entity_type]
    
    # If no exact match, try a more general plural-to-singular conversion
    # This is a fallback and might not cover all edge cases perfectly.
    if entity_type.endswith('s'):
        return entity_type[:-1]
        
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
