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
        logger.info(f"TeamService.create_team invoked with Pydantic model: {team.model_dump_json(indent=2)}") # Log received Pydantic model

        # First check if the league exists
        league = await EntityValidator.validate_league(db, team.league_id) # league is the League model instance
        
        # Attempt to validate or create a DivisionConference based on team.division_conference_id
        try:
            await EntityValidator.validate_division_conference(db, team.division_conference_id)
            # If found, ensure it belongs to the correct league
            await EntityValidator.validate_division_conference_league_relationship(
                db, team.division_conference_id, team.league_id
            )
        except ValueError as e:
            # Check if the error indicates "not found" and if the ID matches the league ID (our fallback case)
            if "not found" in str(e).lower() and team.division_conference_id == team.league_id:
                logger.info(f"DivisionConference with ID {team.division_conference_id} (same as league_id for '{league.name}') not found. Attempting to find or create a mirror.")
                
                from src.services.sports.division_conference_service import DivisionConferenceService
                from src.schemas.sports import DivisionConferenceCreate

                div_conf_service = DivisionConferenceService()
                
                # Try to find an existing DivisionConference that already mirrors this league
                existing_mirror_query = select(DivisionConference).where(
                    DivisionConference.league_id == league.id,
                    DivisionConference.name == league.name, # Assuming mirror uses league's name
                    DivisionConference.type == "League Mirror" # Assuming a specific type for mirrors
                )
                existing_mirror_result = await db.execute(existing_mirror_query)
                mirrored_div_conf = existing_mirror_result.scalars().first()

                if mirrored_div_conf:
                    logger.info(f"Found existing mirrored DivisionConference (ID: {mirrored_div_conf.id}) for league '{league.name}'.")
                    team.division_conference_id = mirrored_div_conf.id
                else:
                    logger.info(f"No existing mirrored DivisionConference for league '{league.name}'. Creating one.")
                    div_conf_create_data = DivisionConferenceCreate(
                        name=league.name,
                        type="League Mirror", # This type should be consistent
                        league_id=league.id
                    )
                    try:
                        new_div_conf = await div_conf_service.create_division_conference(db, div_conf_create_data)
                        team.division_conference_id = new_div_conf.id
                        logger.info(f"Successfully created mirrored DivisionConference (ID: {new_div_conf.id}) for league '{league.name}'.")
                    except Exception as create_exc:
                        logger.error(f"Failed to create mirrored DivisionConference for league '{league.name}': {create_exc}", exc_info=True)
                        raise ValueError(f"Could not ensure Division/Conference for league '{league.name}'. Creation of mirror failed.") from create_exc
            else:
                # Original ID was not the league_id, or some other validation error from validate_division_conference
                raise e # Re-raise the original error
        
        # Handle stadium_id: find or create if name provided, validate if ID provided
        if team.stadium_id is None and team.stadium_name_to_resolve:
            stadium_name_to_find_or_create = team.stadium_name_to_resolve
            logger.info(f"Stadium ID is None, but name '{stadium_name_to_find_or_create}' was provided. Attempting to find or create.")
            from src.services.sports.stadium_service import StadiumService # Moved import here
            from src.schemas.sports import StadiumCreate # Moved import here
            stadium_service = StadiumService()
            
            # Try to find existing stadium by name
            existing_stadium = await stadium_service.get_entity_by_name(db, stadium_name_to_find_or_create, raise_not_found=False)
            
            if existing_stadium:
                logger.info(f"Found existing stadium '{existing_stadium.name}' with ID {existing_stadium.id}.")
                team.stadium_id = existing_stadium.id
            else:
                logger.info(f"Stadium '{stadium_name_to_find_or_create}' not found. Creating new stadium.")
                stadium_create_data = StadiumCreate(
                    name=stadium_name_to_find_or_create,
                    city=team.city, # Use team's city
                    state=team.state, # Use team's state
                    country=team.country # Use team's country
                    # Capacity, owner, etc., would be default or None
                )
                try:
                    new_stadium = await stadium_service.create_stadium(db, stadium_create_data)
                    logger.info(f"Successfully created new stadium '{new_stadium.name}' with ID {new_stadium.id}.")
                    team.stadium_id = new_stadium.id
                except Exception as e_stadium_create:
                    logger.error(f"Failed to create stadium '{stadium_name_to_find_or_create}': {e_stadium_create}", exc_info=True)
                    # Decide behavior: raise error, or proceed with team.stadium_id = None?
                    # For now, let's make it strict: if user provided a stadium name, we try to use/create it. If that fails, team creation fails.
                    raise ValueError(f"Failed to find or create stadium: {stadium_name_to_find_or_create}") from e_stadium_create
        elif team.stadium_id: # If a stadium_id UUID was provided directly
            await EntityValidator.validate_stadium(db, team.stadium_id)
        # If team.stadium_id is None and no stadium_name_to_resolve, it means no stadium was intended (schema allows Optional)

        # Explicit check before creating SQLAlchemy model if stadium_id is still None
        # This is crucial because the database column teams.stadium_id is NOT NULL.
        if team.stadium_id is None:
            # This implies that either no stadium name was given initially,
            # OR a name was given, but the find/create process above failed AND did not re-raise an error stopping execution,
            # OR the find/create logic correctly decided stadium_id should be None (e.g., if creation was optional and failed).
            # Given current DB constraints, this is an error state.
            error_message = f"Stadium ID is None for team '{team.name}'. "
            if team.stadium_name_to_resolve:
                error_message += f"Attempted to resolve/create from name '{team.stadium_name_to_resolve}' but failed. "
            error_message += "A valid stadium ID is required as per database constraints."
            logger.error(error_message)
            raise ValueError(error_message)

        # Check if a team with the same name already exists (after potential division_conference_id and stadium_id update)
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
            team_data_for_model = team.dict()
            # Remove the temporary field before creating the SQLAlchemy model
            team_data_for_model.pop('stadium_name_to_resolve', None)
            db_team = Team(**team_data_for_model)
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