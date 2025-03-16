from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import SQLAlchemyError
from typing import List, Optional, Dict, Any
from uuid import UUID
import logging
from sqlalchemy import select

from src.models.sports_models import Team, League, DivisionConference
from src.schemas.sports import TeamCreate, TeamUpdate
from src.services.sports.base_service import BaseEntityService
from src.services.sports.validators import EntityValidator

logger = logging.getLogger(__name__)

class TeamService(BaseEntityService[Team]):
    """Service for managing teams."""
    
    def __init__(self):
        super().__init__(Team)
    
    async def get_teams(self, db: AsyncSession, league_id: Optional[UUID] = None) -> List[Team]:
        """Get all teams, optionally filtered by league."""
        query = select(Team)
        if league_id:
            query = query.where(Team.league_id == league_id)
        result = await db.execute(query)
        return result.scalars().all()
    
    async def create_team(self, db: AsyncSession, team: TeamCreate) -> Team:
        """Create a new team or update if it already exists."""
        # First check if the league exists
        await EntityValidator.validate_league(db, team.league_id)
        
        # Validate that division_conference exists and belongs to the specified league
        await EntityValidator.validate_division_conference(db, team.division_conference_id)
        await EntityValidator.validate_division_conference_league_relationship(
            db, team.division_conference_id, team.league_id
        )
            
        # Check if a team with the same name already exists
        existing_team = await db.execute(
            select(Team).where(Team.name == team.name)
        )
        db_team = existing_team.scalars().first()

        if db_team:
            # Update existing team
            for key, value in team.dict().items():
                if value is not None:  # Only update non-None values
                    setattr(db_team, key, value)
        else:
            # Create new team
            db_team = Team(**team.dict())
            db.add(db_team)
        
        try:
            await db.commit()
            await db.refresh(db_team)
            return db_team
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Error creating/updating team: {str(e)}")
            raise
    
    async def get_team(self, db: AsyncSession, team_id: UUID) -> Optional[Team]:
        """Get a team by ID."""
        return await super().get_entity(db, team_id)
    
    async def update_team(self, db: AsyncSession, team_id: UUID, team_update: TeamUpdate) -> Optional[Team]:
        """Update a team."""
        # First get the team
        result = await db.execute(select(Team).where(Team.id == team_id))
        db_team = result.scalars().first()
        
        if not db_team:
            return None
        
        # Update team attributes
        update_data = team_update.dict(exclude_unset=True)
        
        # Validate league_id if it's being updated
        if 'league_id' in update_data:
            await EntityValidator.validate_league(db, update_data['league_id'])
        
        # Validate division_conference_id if it's being updated
        if 'division_conference_id' in update_data:
            await EntityValidator.validate_division_conference(db, update_data['division_conference_id'])
            
            # Make sure the division/conference belongs to the team's league
            team_league_id = update_data.get('league_id', db_team.league_id)
            division_conf_result = await db.execute(select(DivisionConference).where(
                DivisionConference.id == update_data['division_conference_id']
            ))
            division_conf = division_conf_result.scalars().first()
            
            if division_conf.league_id != team_league_id:
                raise ValueError(
                    f"Division/Conference with ID {update_data['division_conference_id']} "
                    f"does not belong to League with ID {team_league_id}"
                )
        
        # Validate stadium_id if it's being updated
        if 'stadium_id' in update_data:
            await EntityValidator.validate_stadium(db, update_data['stadium_id'])
        
        # Apply updates
        for key, value in update_data.items():
            setattr(db_team, key, value)
        
        try:
            await db.commit()
            await db.refresh(db_team)
            return db_team
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Error updating team: {str(e)}")
            raise
    
    async def delete_team(self, db: AsyncSession, team_id: UUID) -> bool:
        """Delete a team."""
        return await super().delete_entity(db, team_id)