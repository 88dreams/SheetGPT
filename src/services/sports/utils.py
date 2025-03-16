from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Dict, List, Any, Optional, Type
from uuid import UUID
import logging

from src.models.sports_models import (
    League, Team, Player, Game, Stadium, 
    BroadcastCompany, BroadcastRights, 
    ProductionCompany, ProductionService,
    Brand, BrandRelationship,
    GameBroadcast, LeagueExecutive,
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
    "broadcast_companies": BroadcastCompany,
    "broadcast_rights": BroadcastRights,
    "production_companies": ProductionCompany,
    "production_services": ProductionService,
    "brands": Brand,
    "brand_relationships": BrandRelationship,
    "game_broadcasts": GameBroadcast,
    "league_executives": LeagueExecutive,
    "divisions_conferences": DivisionConference,
    # Singular forms
    "league": League,
    "team": Team,
    "player": Player,
    "game": Game,
    "stadium": Stadium,
    "broadcast_company": BroadcastCompany,
    "broadcast_right": BroadcastRights,
    "production_company": ProductionCompany,
    "production_service": ProductionService,
    "brand": Brand,
    "brand_relationship": BrandRelationship,
    "game_broadcast": GameBroadcast,
    "league_executive": LeagueExecutive,
    "division_conference": DivisionConference,
    # Additional mappings for frontend entity types
    "broadcast": BroadcastRights,
    "production": ProductionService
}

def get_model_for_entity_type(entity_type: str) -> Optional[Type]:
    """Get the model class for a given entity type string."""
    return ENTITY_TYPES.get(entity_type)
    
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