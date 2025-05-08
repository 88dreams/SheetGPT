from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, Dict, Any, Union
from uuid import UUID
import logging

from src.models.sports_models import (
    League, Team, Player, Game, Stadium, 
    BroadcastCompany, BroadcastRights, 
    ProductionCompany, ProductionService,
    Brand, GameBroadcast, LeagueExecutive,
    DivisionConference
)

logger = logging.getLogger(__name__)

class EntityValidator:
    """Validator for entity relationships and constraints."""
    
    @staticmethod
    async def validate_league(db: AsyncSession, league_id: UUID) -> Optional[League]:
        """Validate that a league exists."""
        result = await db.execute(select(League).where(League.id == league_id))
        league = result.scalars().first()
        if not league:
            raise ValueError(f"League with ID {league_id} not found")
        return league
    
    @staticmethod
    async def validate_team(db: AsyncSession, team_id: UUID) -> Optional[Team]:
        """Validate that a team exists."""
        result = await db.execute(select(Team).where(Team.id == team_id))
        team = result.scalars().first()
        if not team:
            raise ValueError(f"Team with ID {team_id} not found")
        return team
    
    @staticmethod
    async def validate_player(db: AsyncSession, player_id: UUID) -> Optional[Player]:
        """Validate that a player exists."""
        result = await db.execute(select(Player).where(Player.id == player_id))
        player = result.scalars().first()
        if not player:
            raise ValueError(f"Player with ID {player_id} not found")
        return player
        
    @staticmethod
    async def validate_stadium(db: AsyncSession, stadium_id: UUID) -> Optional[Stadium]:
        """Validate that a stadium exists."""
        result = await db.execute(select(Stadium).where(Stadium.id == stadium_id))
        stadium = result.scalars().first()
        if not stadium:
            raise ValueError(f"Stadium with ID {stadium_id} not found")
        return stadium
    
    @staticmethod
    async def validate_brand(db: AsyncSession, brand_id: UUID) -> Optional[Brand]:
        """Validate that a brand exists."""
        result = await db.execute(select(Brand).where(Brand.id == brand_id))
        brand = result.scalars().first()
        if not brand:
            raise ValueError(f"Brand with ID {brand_id} not found")
        return brand
    
    @staticmethod
    async def validate_team_update(db: AsyncSession, team_data: Dict[str, Any]) -> None:
        """Validate team data for updates."""
        if 'league_id' in team_data and 'division_conference_id' in team_data:
            # Validate that division_conference belongs to the league
            division_conf_result = await db.execute(select(DivisionConference).where(
                DivisionConference.id == team_data['division_conference_id']
            ))
            division_conf = division_conf_result.scalars().first()
            
            if not division_conf:
                raise ValueError(f"Division/Conference with ID {team_data['division_conference_id']} not found")
                
            if str(division_conf.league_id) \!= str(team_data['league_id']):
                raise ValueError(
                    f"Division/Conference with ID {team_data['division_conference_id']} "
                    f"does not belong to League with ID {team_data['league_id']}"
                )
