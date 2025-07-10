from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import List, Optional, Dict, Any, Union
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from pydantic import ValidationError
import math

from src.models.sports_models import (
    League, Team, Player, Game, Stadium, 
    BroadcastRights, ProductionService,
    Brand, DivisionConference
)
from src.schemas.sports import (
    LeagueCreate, LeagueUpdate, LeagueResponse,
    TeamCreate, TeamUpdate, TeamResponse,
    PlayerCreate, PlayerUpdate, PlayerResponse,
    GameCreate, GameUpdate, GameResponse,
    StadiumCreate, StadiumUpdate, StadiumResponse,
    BroadcastCompanyCreate, BroadcastCompanyUpdate, BroadcastCompanyResponse,
    BroadcastRightsCreate, BroadcastRightsUpdate, BroadcastRightsResponse,
    ProductionCompanyCreate, ProductionCompanyUpdate, ProductionCompanyResponse,
    DivisionConferenceCreate, DivisionConferenceUpdate, DivisionConferenceResponse,
    DivisionConferenceLookupResponse,
    ProductionServiceCreate, ProductionServiceUpdate, ProductionServiceResponse,
    BrandCreate, BrandUpdate, BrandRead,
    EntityExportRequest, EntityExportResponse
)
from src.utils.database import get_db
from src.services.sports_service import SportsService
from src.services.export_service import ExportService
from src.utils.auth import get_current_user
from src.schemas.common import PaginatedResponse
from src.services.sports.player_service import PlayerService
from src.utils.errors import (
    EntityNotFoundError, 
    EntityValidationError,
    DatabaseOperationError
)
from src.services.sports.league_service import LeagueService
from src.services.sports.utils import normalize_entity_type
from src.services.sports.game_service import GameService

router = APIRouter()
sports_service = SportsService()
export_service = ExportService()

# Lookup endpoint for entity by name
@router.get("/lookup/{entity_type}", response_model=Dict)
async def lookup_entity_by_name(
    entity_type: str,
    name: str,
    league_id: Optional[UUID] = Query(None, description="Optional league ID to scope the search for division/conference"),
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """
    Looks up an entity by name. For division/conference, can be scoped by league_id.
    """
    try:
        normalized_type = normalize_entity_type(entity_type)
        if normalized_type not in sports_service.ENTITY_TYPES:
            raise EntityValidationError(
                message=f"Invalid entity type: {entity_type}",
                entity_type=entity_type,
                details={"valid_types": list(sports_service.ENTITY_TYPES.keys())}
            )
            
        entity = await sports_service.get_entity_by_name(db, normalized_type, name, league_id=league_id)
        
        if not entity:
            raise HTTPException(status_code=404, detail=f"{entity_type} '{name}' not found.")

        return entity
    except ValueError as e:
        # Map legacy ValueError to our new error types
        raise EntityValidationError(
            message=str(e),
            entity_type=entity_type
        )

# Generic entity endpoints
@router.get("/entities/{entity_type}", response_model=PaginatedResponse[Dict[str, Any]])
async def get_entities(
    entity_type: str,
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=10000, description="Items per page"),
    sort_by: str = Query("id", description="Field to sort by"),
    sort_direction: str = Query("asc", description="Sort direction (asc or desc)"),
    filters: Optional[str] = Query(None, description="JSON string of filter conditions"),
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Get paginated entities of a specific type."""
    try:
        # Parse filters if provided
        filter_conditions = None
        if filters:
            import json
            try:
                filter_conditions = json.loads(filters)
                print(f"Parsed filters: {filter_conditions}")
            except json.JSONDecodeError:
                raise ValueError(f"Invalid filter format: {filters}")

        # Standard, consistent handling for all entity types
        result = await sports_service.get_entities_with_related_names(
            entity_type=entity_type,
            page=page,
            page_size=limit,
            sort_field=sort_by,
            sort_direction=sort_direction,
            filters=filter_conditions
        )
        
        # Unpack the tuple result
        entities_list, total_count = result

        # Construct the dictionary for PaginatedResponse
        response_data = {
            "items": entities_list,
            "total": total_count,
            "page": page,
            "size": limit, # 'limit' is the query param for page size
            "pages": math.ceil(total_count / limit) if limit > 0 else 0 # Avoid division by zero, return 0 pages if limit is 0
        }
        
        # Log the number of results for debugging using the new response_data dict
        print(f"Found {len(response_data.get('items', []))} results for {entity_type} with filters: {filter_conditions}")
        
        return response_data # This dict will be validated by PaginatedResponse
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# League endpoints
@router.get("/leagues", response_model=List[LeagueResponse])
async def get_leagues(
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Get all leagues."""
    return await sports_service.get_leagues(db)

@router.get("/distinct-sports", response_model=List[str])
async def get_distinct_sports_route(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get a list of distinct sport names from all leagues."""
    league_service = LeagueService()
    try:
        sports = await league_service.get_distinct_sports(db)
        return sports
    except Exception as e:
        # Log the exception for debugging
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error fetching distinct sports: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while fetching distinct sport names."
        )

# DivisionsConferences endpoints
@router.get("/divisions-conferences", response_model=List[DivisionConferenceResponse])
async def get_divisions_conferences(
    league_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Get all divisions/conferences, optionally filtered by league."""
    query = select(DivisionConference)
    if league_id:
        query = query.where(DivisionConference.league_id == league_id)
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/divisions-conferences", response_model=DivisionConferenceResponse, status_code=status.HTTP_201_CREATED)
async def create_division_conference(
    division_conference: DivisionConferenceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Create a new division/conference."""
    # First check if the league exists
    league_result = await db.execute(select(League).where(League.id == division_conference.league_id))
    league = league_result.scalars().first()
    if not league:
        raise HTTPException(status_code=404, detail="League not found")
        
    # Create the division/conference
    db_division_conference = DivisionConference(**division_conference.dict())
    db.add(db_division_conference)
    
    try:
        await db.commit()
        await db.refresh(db_division_conference)
        
        # Attach league name for the response
        response_obj = {**db_division_conference.__dict__}
        response_obj["league_name"] = league.name
        return response_obj
    except SQLAlchemyError as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating division/conference: {str(e)}")

@router.get("/divisions-conferences/{division_conference_id}", response_model=DivisionConferenceResponse)
async def get_division_conference(
    division_conference_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Get a specific division/conference by ID."""
    # Join with League to get the league name
    query = (
        select(DivisionConference, League.name.label("league_name"))
        .join(League, DivisionConference.league_id == League.id)
        .where(DivisionConference.id == division_conference_id)
    )
    result = await db.execute(query)
    record = result.first()
    
    if not record:
        raise HTTPException(status_code=404, detail="Division/Conference not found")
    
    # Convert to a response object with league_name
    division_conference = record[0]
    league_name = record[1]
    
    response_obj = {**division_conference.__dict__}
    response_obj["league_name"] = league_name
    
    return response_obj

@router.put("/divisions-conferences/{division_conference_id}", response_model=DivisionConferenceResponse)
async def update_division_conference(
    division_conference_id: UUID,
    division_conference_update: DivisionConferenceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Update a specific division/conference."""
    # First check if the division/conference exists
    div_conf_query = (
        select(DivisionConference, League.name.label("league_name"))
        .join(League, DivisionConference.league_id == League.id)
        .where(DivisionConference.id == division_conference_id)
    )
    result = await db.execute(div_conf_query)
    record = result.first()
    
    if not record:
        raise HTTPException(status_code=404, detail="Division/Conference not found")
    
    db_division_conference = record[0]
    league_name = record[1]
    
    # If league_id is provided, check if it's valid
    update_data = division_conference_update.dict(exclude_unset=True)
    if 'league_id' in update_data and update_data['league_id'] is not None:
        league_result = await db.execute(select(League).where(League.id == update_data['league_id']))
        league = league_result.scalars().first()
        if not league:
            raise HTTPException(status_code=404, detail="League not found")
        league_name = league.name
    
    # Update the division/conference
    for key, value in update_data.items():
        setattr(db_division_conference, key, value)
    
    try:
        await db.commit()
        await db.refresh(db_division_conference)
        
        # Return with league name
        response_obj = {**db_division_conference.__dict__}
        response_obj["league_name"] = league_name
        
        return response_obj
    except SQLAlchemyError as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating division/conference: {str(e)}")

@router.delete("/divisions-conferences/{division_conference_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_division_conference(
    division_conference_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Delete a specific division/conference."""
    result = await db.execute(select(DivisionConference).where(DivisionConference.id == division_conference_id))
    db_division_conference = result.scalars().first()
    if not db_division_conference:
        raise HTTPException(status_code=404, detail="Division/Conference not found")
    
    try:
        await db.delete(db_division_conference)
        await db.commit()
        return None
    except SQLAlchemyError as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting division/conference: {str(e)}")

@router.post("/leagues", response_model=LeagueResponse, status_code=status.HTTP_201_CREATED)
async def create_league(
    league: LeagueCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Create a new league or update if one with the same name already exists.
    
    If a league with the provided name already exists, its information will be updated
    with any non-null values from the request. This prevents duplicate leagues while
    allowing updates to existing ones.
    """
    return await sports_service.create_league(db, league)

@router.get("/leagues/{league_id}", response_model=LeagueResponse)
async def get_league(
    league_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Get a specific league by ID."""
    league = await sports_service.get_league(db, league_id)
    if not league:
        raise HTTPException(status_code=404, detail="League not found")
    return league

@router.put("/leagues/{league_id}", response_model=LeagueResponse)
async def update_league(
    league_id: UUID,
    league_update: LeagueUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Update a specific league."""
    league = await sports_service.update_league(db, league_id, league_update)
    if not league:
        raise HTTPException(status_code=404, detail="League not found")
    return league

@router.delete("/leagues/{league_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_league(
    league_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Delete a specific league."""
    success = await sports_service.delete_league(db, league_id)
    if not success:
        raise HTTPException(status_code=404, detail="League not found")
    return None

# Team endpoints
@router.get("/teams", response_model=List[TeamResponse])
async def get_teams(
    league_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Get all teams, optionally filtered by league."""
    return await sports_service.get_teams(db, league_id)

@router.post("/teams", response_model=TeamResponse, status_code=status.HTTP_201_CREATED)
async def create_team(
    team_data: Dict[str, Any],
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Create a new team or update if one with the same name already exists.
    
    If a team with the provided name already exists, its information will be updated
    with any non-null values from the request. This prevents duplicate teams while
    allowing updates to existing ones.
    
    Also handles partial updates where only the division_conference_id is provided.
    """
    # Print the team data for debugging
    print(f"Received team data: {team_data}")
    
    # Check if this could be a partial update (has name and division_conference_id)
    try:
        if 'name' in team_data and 'division_conference_id' in team_data:
            # Check if we're missing required fields - that would indicate this is a partial update
            required_fields = ['league_id', 'stadium_id', 'city', 'country']
            missing_fields = [field for field in required_fields if field not in team_data]
            
            print(f"Missing fields for team {team_data['name']}: {missing_fields}")
            
            # If we're missing some required fields, treat this as a partial update
            if len(missing_fields) > 0:
                print(f"Treating as partial update for team: {team_data['name']}")
                
                # Look up the existing team by name
                query = select(Team).where(Team.name == team_data['name'])
                result = await db.execute(query)
                existing_team = result.scalars().first()
            
            if existing_team:
                # This is a partial update to an existing team
                print(f"Detected partial update for team: {team_data['name']}")
                
                try:
                    # Verify division_conference_id exists
                    div_conf_id = team_data['division_conference_id']
                    div_result = await db.execute(select(DivisionConference).where(DivisionConference.id == div_conf_id))
                    div_conf = div_result.scalars().first()
                    
                    if not div_conf:
                        raise HTTPException(status_code=404, detail=f"Division/Conference with ID {div_conf_id} not found")
                    
                    # Update just the division_conference_id field
                    existing_team.division_conference_id = div_conf_id
                    await db.commit()
                    await db.refresh(existing_team)
                    return existing_team
                except Exception as e:
                    await db.rollback()
                    print(f"Error performing partial update: {str(e)}")
                    raise HTTPException(status_code=500, detail=f"Error performing partial update: {str(e)}")
    except Exception as e:
        print(f"Error in partial update check: {str(e)}")
        # Continue to normal processing
    
    # If not a partial update, process as normal create/update
    # Convert dict to TeamCreate model
    try:
        print(f"Creating team with data: {team_data}")
        team = TeamCreate(**team_data)
        return await sports_service.create_team(db, team)
    except ValidationError as e:
        print(f"Validation error: {str(e)}")
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")

@router.get("/teams/{team_id}", response_model=TeamResponse)
async def get_team(
    team_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Get a specific team by ID."""
    team = await sports_service.get_team(db, team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return team

@router.put("/teams/{team_id}", response_model=TeamResponse)
async def update_team(
    team_id: UUID,
    team_update: TeamUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Update a specific team."""
    team = await sports_service.update_team(db, team_id, team_update)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return team
    
@router.patch("/teams/{team_id}", response_model=TeamResponse)
async def partial_update_team(
    team_id: UUID,
    team_update: Dict[str, Any],
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """
    Partially update a specific team. Only the fields provided will be updated.
    This endpoint is designed for updating specific fields on existing teams.
    """
    # First retrieve the existing team
    result = await db.execute(select(Team).where(Team.id == team_id))
    db_team = result.scalars().first()
    
    if not db_team:
        raise HTTPException(status_code=404, detail="Team not found")
        
    # Update only the fields that are provided
    for key, value in team_update.items():
        if hasattr(db_team, key):
            # Verify foreign key references if needed
            if key == 'division_conference_id' and value is not None:
                div_conf_result = await db.execute(select(DivisionConference).where(DivisionConference.id == value))
                div_conf = div_conf_result.scalars().first()
                if not div_conf:
                    raise HTTPException(status_code=404, detail=f"Division/Conference with ID {value} not found")
                    
            # Apply the update
            setattr(db_team, key, value)
        else:
            # Skip unknown fields
            continue
    
    try:
        await db.commit()
        await db.refresh(db_team)
        return db_team
    except SQLAlchemyError as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating team: {str(e)}")

# Generic endpoint for partial updates by name lookup
@router.post("/update-by-name/{entity_type}")
async def update_entity_by_name(
    entity_type: str,
    update_data: Dict[str, Any],
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """
    Generic endpoint for partial updates of any entity type by name.
    
    Requires:
    - name: Name of the entity to update
    - At least one field to update
    
    This endpoint is more flexible than the standard update endpoints
    as it doesn't require all fields to be present - just the ones
    you want to update.
    """
    print(f"Updating {entity_type} by name with data: {update_data}")
    
    # Validate required fields
    if 'name' not in update_data:
        raise HTTPException(status_code=422, detail="'name' field is required to identify the entity")
    
    # Determine which model to use based on entity_type
    model_class = None
    if entity_type == 'team':
        model_class = Team
    elif entity_type == 'league':
        model_class = League
    elif entity_type == 'division_conference':
        model_class = DivisionConference
    elif entity_type == 'player':
        model_class = Player
    elif entity_type == 'stadium':
        model_class = Stadium
    elif entity_type == 'brand':
        model_class = Brand
    # Add other entity types as needed
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported entity type: {entity_type}")
    
    # Look up the entity by name
    entity_name = update_data.pop('name')  # Remove name from update data
    lookup_query = select(model_class).where(model_class.name == entity_name)
    result = await db.execute(lookup_query)
    entity = result.scalars().first()
    
    if not entity:
        raise HTTPException(status_code=404, detail=f"{entity_type.capitalize()} with name '{entity_name}' not found")
    
    # Validate relationship fields if present
    if entity_type == 'team' and 'division_conference_id' in update_data:
        div_conf_id = update_data['division_conference_id']
        div_conf_result = await db.execute(select(DivisionConference).where(DivisionConference.id == div_conf_id))
        div_conf = div_conf_result.scalars().first()
        
        if not div_conf:
            raise HTTPException(status_code=404, detail=f"Division/Conference with ID '{div_conf_id}' not found")
    
    # Update the entity with provided fields
    for field, value in update_data.items():
        if hasattr(entity, field):
            setattr(entity, field, value)
    
    try:
        await db.commit()
        await db.refresh(entity)
        return entity
    except SQLAlchemyError as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating {entity_type}: {str(e)}")

@router.delete("/teams/{team_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_team(
    team_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Delete a specific team."""
    success = await sports_service.delete_team(db, team_id)
    if not success:
        raise HTTPException(status_code=404, detail="Team not found")
    return None

# Player endpoints
@router.get("/players", response_model=List[PlayerResponse])
async def get_players(
    team_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Get all players, optionally filtered by team."""
    player_service = PlayerService()
    players_from_db = await player_service.get_players(db, team_id)
    response_players = []
    for player in players_from_db:
        player_data = player.__dict__ # Convert SQLAlchemy model to dict
        if player.sponsor: # Check if sponsor relationship was loaded and exists
            player_data['sponsor_name'] = player.sponsor.name
        else:
            player_data['sponsor_name'] = None
        response_players.append(PlayerResponse.model_validate(player_data)) # Use model_validate for Pydantic v2
    return response_players

@router.post("/players", response_model=PlayerResponse, status_code=status.HTTP_201_CREATED)
async def create_player(
    player: PlayerCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Create a new player or update if one with the same name already exists.
    
    If a player with the provided name already exists, their information will be updated
    with any non-null values from the request. This prevents duplicate players while
    allowing updates to existing ones.
    """
    player_service = PlayerService()
    return await player_service.create_player(db, player)

@router.get("/players/{player_id}", response_model=PlayerResponse)
async def get_player(
    player_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Get a specific player by ID."""
    player_service = PlayerService()
    player_obj = await player_service.get_player(db, player_id)
    if not player_obj:
        raise HTTPException(status_code=404, detail="Player not found")
    return player_obj

@router.put("/players/{player_id}", response_model=PlayerResponse)
async def update_player(
    player_id: UUID,
    player_update: PlayerUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Update a specific player."""
    player_service = PlayerService()
    player_obj = await player_service.update_player(db, player_id, player_update)
    if not player_obj:
        raise HTTPException(status_code=404, detail="Player not found")
    return player_obj

@router.delete("/players/{player_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_player(
    player_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Delete a specific player."""
    player_service = PlayerService()
    success = await player_service.delete_player(db, player_id)
    if not success:
        raise HTTPException(status_code=404, detail="Player not found")
    return None

# Game endpoints
@router.get("/games", response_model=List[GameResponse])
async def get_games(
    league_id: Optional[UUID] = None,
    team_id: Optional[UUID] = None,
    season_year: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Get all games, optionally filtered by league, team, or season."""
    game_service = GameService()
    return await game_service.get_games(db, league_id, team_id, season_year)

@router.post("/games", response_model=GameResponse, status_code=status.HTTP_201_CREATED)
async def create_game(
    game: GameCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Create a new game."""
    game_service = GameService()
    return await game_service.create_game(db, game)

@router.get("/games/{game_id}", response_model=GameResponse)
async def get_game(
    game_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Get a specific game by ID."""
    game_service = GameService()
    game = await game_service.get_game(db, game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    return game

@router.put("/games/{game_id}", response_model=GameResponse)
async def update_game(
    game_id: UUID,
    game_update: GameUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Update a specific game."""
    game_service = GameService()
    game = await game_service.update_game(db, game_id, game_update)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    return game

@router.delete("/games/{game_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_game(
    game_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Delete a specific game."""
    game_service = GameService()
    success = await game_service.delete_game(db, game_id)
    if not success:
        raise HTTPException(status_code=404, detail="Game not found")
    return None

# Stadium endpoints
@router.get("/stadiums", response_model=List[StadiumResponse])
async def get_stadiums(
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Get all stadiums."""
    return await sports_service.get_stadiums(db)

@router.post("/stadiums", response_model=StadiumResponse, status_code=status.HTTP_201_CREATED)
async def create_stadium(
    stadium: StadiumCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Create a new stadium or update if one with the same name already exists.
    
    If a stadium with the provided name already exists, its information will be updated
    with any non-null values from the request. This prevents duplicate stadiums while
    allowing updates to existing ones.
    """
    return await sports_service.create_stadium(db, stadium)

@router.get("/stadiums/{stadium_id}", response_model=StadiumResponse)
async def get_stadium(
    stadium_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Get a specific stadium by ID."""
    stadium = await sports_service.get_stadium(db, stadium_id)
    if not stadium:
        raise HTTPException(status_code=404, detail="Stadium not found")
    return stadium

@router.put("/stadiums/{stadium_id}", response_model=StadiumResponse)
async def update_stadium(
    stadium_id: UUID,
    stadium_update: StadiumUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Update a specific stadium."""
    stadium = await sports_service.update_stadium(db, stadium_id, stadium_update)
    if not stadium:
        raise HTTPException(status_code=404, detail="Stadium not found")
    return stadium

@router.delete("/stadiums/{stadium_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_stadium(
    stadium_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Delete a specific stadium."""
    success = await sports_service.delete_stadium(db, stadium_id)
    if not success:
        raise HTTPException(status_code=404, detail="Stadium not found")
    return None

# Broadcast Company endpoints
@router.get("/broadcast-companies", response_model=List[BroadcastCompanyResponse])
async def get_broadcast_companies(
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """
    Get all broadcast companies.
    
    Note: This endpoint now uses the unified Brand model with company_type='Broadcaster'
    """
    # Get brands with company_type='Broadcaster'
    from src.services.sports.broadcast_service import BroadcastCompanyService
    broadcast_service = BroadcastCompanyService()
    
    # Use the specialized service method that filters by company type
    result = await broadcast_service.get_broadcast_companies(db)
    
    # Convert the result from paginated dict to list of items
    if isinstance(result, dict) and "items" in result:
        return result["items"]
    
    # Fallback in case the result is already a list
    return result

@router.post("/broadcast-companies", response_model=BroadcastCompanyResponse, status_code=status.HTTP_201_CREATED)
async def create_broadcast_company(
    broadcast_company: BroadcastCompanyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """
    Create a new broadcast company.
    
    Note: This endpoint now creates a Brand with company_type='Broadcaster'
    """
    # Use the broadcast service to create a broadcaster brand
    from src.services.sports.broadcast_service import BroadcastCompanyService
    broadcast_service = BroadcastCompanyService()
    
    # Create the broadcast company as a Brand
    return await broadcast_service.create_broadcast_company(db, broadcast_company)

@router.get("/broadcast-companies/{company_id}", response_model=BroadcastCompanyResponse)
async def get_broadcast_company(
    company_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """
    Get a specific broadcast company by ID.
    
    Note: This endpoint now retrieves a Brand with company_type='Broadcaster'
    """
    # Use the broadcast service to get a brand by ID
    from src.services.sports.broadcast_service import BroadcastCompanyService
    broadcast_service = BroadcastCompanyService()
    
    try:
        # Get the broadcast company (Brand)
        company = await broadcast_service.get_broadcast_company(db, company_id)
        return company
    except Exception as e:
        # Handle any errors, including EntityNotFoundError
        raise HTTPException(status_code=404, detail=f"Broadcast company not found: {str(e)}")

@router.put("/broadcast-companies/{company_id}", response_model=BroadcastCompanyResponse)
async def update_broadcast_company(
    company_id: UUID,
    company_update: BroadcastCompanyUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """
    Update a specific broadcast company.
    
    Note: This endpoint now updates a Brand with company_type='Broadcaster'
    """
    # Use the broadcast service to update a brand
    from src.services.sports.broadcast_service import BroadcastCompanyService
    broadcast_service = BroadcastCompanyService()
    
    try:
        # Update the broadcast company (Brand)
        company = await broadcast_service.update_broadcast_company(db, company_id, company_update)
        return company
    except Exception as e:
        # Handle any errors, including EntityNotFoundError
        raise HTTPException(status_code=404, detail=f"Broadcast company not found or update failed: {str(e)}")

@router.delete("/broadcast-companies/{company_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_broadcast_company(
    company_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """
    Delete a specific broadcast company.
    
    Note: This endpoint now deletes a Brand with company_type='Broadcaster'
    """
    # Use the broadcast service to delete a brand
    from src.services.sports.broadcast_service import BroadcastCompanyService
    broadcast_service = BroadcastCompanyService()
    
    try:
        # Delete the broadcast company (Brand)
        success = await broadcast_service.delete_broadcast_company(db, company_id)
        if not success:
            raise HTTPException(status_code=404, detail="Broadcast company not found")
        return None
    except Exception as e:
        # Handle any errors, including EntityNotFoundError
        raise HTTPException(status_code=404, detail=f"Broadcast company not found or delete failed: {str(e)}")

# Broadcast Rights endpoints
@router.get("/broadcast-rights", response_model=List[BroadcastRightsResponse])
async def get_broadcast_rights(
    entity_type: Optional[str] = None,
    entity_id: Optional[UUID] = None,
    company_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Get all broadcast rights, optionally filtered by entity or company."""
    return await sports_service.get_broadcast_rights(db, entity_type, entity_id, company_id)

@router.post("/broadcast-rights", response_model=BroadcastRightsResponse, status_code=status.HTTP_201_CREATED)
async def create_broadcast_rights(
    broadcast_rights: BroadcastRightsCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Create new broadcast rights."""
    try:
        # Direct implementation as a workaround for missing method in SportsService
        from src.services.sports.broadcast_service import BroadcastRightsService
        
        # Create a service instance directly
        broadcast_rights_service = BroadcastRightsService()
        
        # Use the service to create broadcast rights
        return await broadcast_rights_service.create_broadcast_rights(db, broadcast_rights)
    except Exception as e:
        # Log the error and re-raise
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error creating broadcast rights: {str(e)}")
        raise

@router.get("/broadcast-rights/{rights_id}", response_model=BroadcastRightsResponse)
async def get_broadcast_rights_by_id(
    rights_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Get specific broadcast rights by ID."""
    rights = await sports_service.get_broadcast_right(db, rights_id)
    if not rights:
        raise HTTPException(status_code=404, detail="Broadcast rights not found")
    return rights

@router.put("/broadcast-rights/{rights_id}", response_model=BroadcastRightsResponse)
async def update_broadcast_rights(
    rights_id: UUID,
    rights_update: BroadcastRightsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Update specific broadcast rights."""
    rights = await sports_service.update_broadcast_rights(db, rights_id, rights_update)
    if not rights:
        raise HTTPException(status_code=404, detail="Broadcast rights not found")
    return rights

@router.delete("/broadcast-rights/{rights_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_broadcast_rights(
    rights_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Delete specific broadcast rights."""
    success = await sports_service.delete_broadcast_rights(db, rights_id)
    if not success:
        raise HTTPException(status_code=404, detail="Broadcast rights not found")
    return None

# Production Company endpoints
@router.get("/production-companies", response_model=List[ProductionCompanyResponse])
async def get_production_companies(
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """
    Get all production companies.
    
    Note: This endpoint now uses the unified Brand model with company_type='Production Company'
    """
    # Get brands with company_type='Production Company'
    from src.services.sports.production_service import ProductionCompanyService
    production_service = ProductionCompanyService()
    
    # Use the specialized service method that filters by company type
    result = await production_service.get_production_companies(db)
    
    # Convert the result from paginated dict to list of items
    if isinstance(result, dict) and "items" in result:
        return result["items"]
    
    # Fallback in case the result is already a list
    return result

@router.post("/production-companies", response_model=ProductionCompanyResponse, status_code=status.HTTP_201_CREATED)
async def create_production_company(
    production_company: ProductionCompanyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """
    Create a new production company.
    
    Note: This endpoint now creates a Brand with company_type='Production Company'
    """
    # Use the production service to create a production company brand
    from src.services.sports.production_service import ProductionCompanyService
    production_service = ProductionCompanyService()
    
    # Create the production company as a Brand
    return await production_service.create_production_company(db, production_company)

@router.get("/production-companies/{company_id}", response_model=ProductionCompanyResponse)
async def get_production_company(
    company_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """
    Get a specific production company by ID.
    
    Note: This endpoint now retrieves a Brand with company_type='Production Company'
    """
    # Use the production service to get a brand by ID
    from src.services.sports.production_service import ProductionCompanyService
    production_service = ProductionCompanyService()
    
    try:
        # Get the production company (Brand)
        company = await production_service.get_production_company(db, company_id)
        return company
    except Exception as e:
        # Handle any errors, including EntityNotFoundError
        raise HTTPException(status_code=404, detail=f"Production company not found: {str(e)}")

@router.put("/production-companies/{company_id}", response_model=ProductionCompanyResponse)
async def update_production_company(
    company_id: UUID,
    company_update: ProductionCompanyUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """
    Update a specific production company.
    
    Note: This endpoint now updates a Brand with company_type='Production Company'
    """
    # Use the production service to update a brand
    from src.services.sports.production_service import ProductionCompanyService
    production_service = ProductionCompanyService()
    
    try:
        # Update the production company (Brand)
        company = await production_service.update_production_company(db, company_id, company_update)
        return company
    except Exception as e:
        # Handle any errors, including EntityNotFoundError
        raise HTTPException(status_code=404, detail=f"Production company not found or update failed: {str(e)}")

@router.delete("/production-companies/{company_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_production_company(
    company_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """
    Delete a specific production company.
    
    Note: This endpoint now deletes a Brand with company_type='Production Company'
    """
    # Use the production service to delete a brand
    from src.services.sports.production_service import ProductionCompanyService
    production_service = ProductionCompanyService()
    
    try:
        # Delete the production company (Brand)
        success = await production_service.delete_production_company(db, company_id)
        if not success:
            raise HTTPException(status_code=404, detail="Production company not found")
        return None
    except Exception as e:
        # Handle any errors, including EntityNotFoundError
        raise HTTPException(status_code=404, detail=f"Production company not found or delete failed: {str(e)}")

# Production Service endpoints
@router.get("/production-services", response_model=List[ProductionServiceResponse])
async def get_production_services(
    entity_type: Optional[str] = None,
    entity_id: Optional[UUID] = None,
    company_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Get all production services, optionally filtered by entity or company."""
    return await sports_service.get_production_services(db, entity_type, entity_id, company_id)

@router.post("/production-services", response_model=ProductionServiceResponse, status_code=status.HTTP_201_CREATED)
async def create_production_service(
    production_service: ProductionServiceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """
    Create a new production service.
    
    If the production_company_id or secondary_brand_id is a name instead of a UUID, will attempt to find a brand
    with that name and use its ID. If no brand exists, will create one automatically.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        from src.services.sports.production_service import ProductionServiceService
        from src.services.sports.brand_service import BrandService
        from uuid import UUID
        
        # Check if production_company_id is a UUID or a name
        try:
            # Try to parse as UUID
            UUID(str(production_service.production_company_id))
            # If successful, use as-is
        except ValueError:
            # Not a UUID, must be a name - look it up
            company_name = str(production_service.production_company_id)
            logger.info(f"Looking up production company by name: {company_name}")
            
            # Try to find an existing brand with this name
            entity = await sports_service.get_entity_by_name(db, "brand", company_name)
            
            if not entity:
                # No brand found, create one
                logger.info(f"No brand found for '{company_name}', creating new brand")
                brand_service = BrandService()
                brand = await brand_service.create_production_company(db, {
                    "name": company_name,
                    "industry": "Production",
                    "company_type": "Production Company",
                    "country": "USA"  # Default
                })
                production_service.production_company_id = brand.id
            else:
                # Found a brand, use its ID
                production_service.production_company_id = entity["id"]
                logger.info(f"Using brand ID {entity['id']} for company '{company_name}'")
        
        # Check if secondary_brand_id is provided and if it's a UUID or a name
        if production_service.secondary_brand_id:
            try:
                # Try to parse as UUID
                UUID(str(production_service.secondary_brand_id))
                # If successful, use as-is
            except ValueError:
                # Not a UUID, must be a name - look it up
                brand_name = str(production_service.secondary_brand_id)
                logger.info(f"Looking up secondary brand by name: {brand_name}")
                
                # Try to find an existing brand with this name
                entity = await sports_service.get_entity_by_name(db, "brand", brand_name)
                
                if not entity:
                    # No brand found, create one
                    logger.info(f"No brand found for '{brand_name}', creating new brand")
                    brand_service = BrandService()
                    brand = await brand_service.create_brand(db, {
                        "name": brand_name,
                        "industry": "Media",
                        "company_type": "Broadcaster",  # Default for secondary brand
                        "country": "USA"  # Default
                    })
                    production_service.secondary_brand_id = brand.id
                else:
                    # Found a brand, use its ID
                    production_service.secondary_brand_id = entity["id"]
                    logger.info(f"Using brand ID {entity['id']} for secondary brand '{brand_name}'")
        
        # Check if entity_id is provided and if it's a UUID or a name
        if production_service.entity_id:
            try:
                # Try to parse as UUID
                UUID(str(production_service.entity_id))
                # If successful, use as-is
            except ValueError:
                # Not a UUID, must be a name - look it up
                entity_name = str(production_service.entity_id)
                entity_type = production_service.entity_type
                # Normalize entity types
                if entity_type.lower() in ('division', 'conference'):
                    entity_type = 'division_conference'
                # Map tournament type to an appropriate entity type if needed
                # This handles special cases where frontend may use different terminology
                    
                logger.info(f"Looking up {entity_type} by name: {entity_name}")
                
                # Try to find an existing entity with this name
                entity = await sports_service.get_entity_by_name(db, entity_type, entity_name)
                
                if entity:
                    # Found an entity, use its ID
                    production_service.entity_id = entity["id"]
                    logger.info(f"Using entity ID {entity['id']} for {entity_type} '{entity_name}'")
                else:
                    # For special entity types, generate a deterministic UUID
                    if entity_type.lower() in ('championship', 'playoff', 'playoffs', 'tournament'):
                        import hashlib
                        from uuid import UUID
                        
                        # Generate UUID based on entity type and name
                        name_hash = hashlib.md5(f"{entity_type}:{entity_name}".encode()).hexdigest()
                        generated_uuid = UUID(name_hash[:32])
                        logger.info(f"Generated UUID {generated_uuid} for {entity_type}: {entity_name}")
                        production_service.entity_id = generated_uuid
                    else:
                        # Try to find in any of the supported entity types
                        found_entity = False
                        
                        # Skip lookups if we're already checking division_conference
                        if entity_type.lower() != 'division_conference':
                            # Try division_conference first
                            logger.info(f"Trying to find entity '{entity_name}' as a division_conference")
                            div_conf_entity = await sports_service.get_entity_by_name(db, "division_conference", entity_name)
                            if div_conf_entity:
                                logger.info(f"Found as division_conference with ID {div_conf_entity['id']}")
                                # Change entity type to division_conference since we found it there
                                production_service.entity_type = "division_conference"
                                production_service.entity_id = div_conf_entity["id"]
                                found_entity = True
                        
                        # Try looking up as a league as a fallback if not found yet
                        if not found_entity:
                            logger.info(f"Trying to find entity '{entity_name}' as a league")
                            league_entity = await sports_service.get_entity_by_name(db, "league", entity_name)
                            if league_entity:
                                logger.info(f"Found as league with ID {league_entity['id']}")
                                # Change entity type to league since we found it as a league
                                production_service.entity_type = "league"
                                production_service.entity_id = league_entity["id"]
                                found_entity = True
                                
                        # If still not found in any entity type, raise error
                        if not found_entity:
                            # No entity found, raise error
                            raise ValueError(f"No {entity_type} found with name '{entity_name}'")
        
        # Create the production service
        production_service_service = ProductionServiceService()
        return await production_service_service.create_production_service(db, production_service)
        
    except Exception as e:
        logger.error(f"Error creating production service: {str(e)}")
        raise

@router.get("/production-services/{service_id}", response_model=ProductionServiceResponse)
async def get_production_service(
    service_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Get a specific production service by ID."""
    service = await sports_service.get_production_service(db, service_id)
    if not service:
        raise HTTPException(status_code=404, detail="Production service not found")
    return service

@router.put("/production-services/{service_id}", response_model=ProductionServiceResponse)
async def update_production_service(
    service_id: UUID,
    service_update: ProductionServiceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """
    Update a specific production service.
    
    If secondary_brand_id or entity_id is provided as a name instead of a UUID,
    will attempt to find or create the corresponding entity and use its ID.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        from src.services.sports.brand_service import BrandService
        from src.services.sports.production_service import ProductionServiceService, ProductionService
        from sqlalchemy import select
        from uuid import UUID
        
        # Check if secondary_brand_id is provided and if it's a UUID or a name
        if service_update.secondary_brand_id:
            try:
                # Try to parse as UUID
                UUID(str(service_update.secondary_brand_id))
                # If successful, use as-is
            except ValueError:
                # Not a UUID, must be a name - look it up
                brand_name = str(service_update.secondary_brand_id)
                logger.info(f"Looking up secondary brand by name: {brand_name}")
                
                # Try to find an existing brand with this name
                entity = await sports_service.get_entity_by_name(db, "brand", brand_name)
                
                if not entity:
                    # No brand found, create one
                    logger.info(f"No brand found for '{brand_name}', creating new brand")
                    brand_service = BrandService()
                    brand = await brand_service.create_brand(db, {
                        "name": brand_name,
                        "industry": "Media",
                        "company_type": "Broadcaster",  # Default for secondary brand
                        "country": "USA"  # Default
                    })
                    service_update.secondary_brand_id = brand.id
                else:
                    # Found a brand, use its ID
                    service_update.secondary_brand_id = entity["id"]
                    logger.info(f"Using brand ID {entity['id']} for secondary brand '{brand_name}'")
        
        # Check if entity_id is provided and if it's a UUID or a name
        if service_update.entity_id:
            try:
                # Try to parse as UUID
                UUID(str(service_update.entity_id))
                # If successful, use as-is
            except ValueError:
                # Not a UUID, must be a name - look it up
                entity_name = str(service_update.entity_id)
                # Get current entity_type or use the updated one if provided
                entity_type = service_update.entity_type
                
                if not entity_type:
                    # Need to get the current entity_type
                    service_result = await db.execute(
                        select(ProductionService.entity_type).where(ProductionService.id == service_id)
                    )
                    entity_type = service_result.scalar_one_or_none()
                    
                if not entity_type:
                    raise ValueError("Entity type is required to resolve entity name")
                    
                # Normalize entity types
                if entity_type.lower() in ('division', 'conference'):
                    entity_type = 'division_conference'
                # Map tournament type to an appropriate entity type if needed
                # This handles special cases where frontend may use different terminology
                    
                logger.info(f"Looking up {entity_type} by name: {entity_name}")
                
                # Try to find an existing entity with this name
                entity = await sports_service.get_entity_by_name(db, entity_type, entity_name)
                
                if entity:
                    # Found an entity, use its ID
                    service_update.entity_id = entity["id"]
                    logger.info(f"Using entity ID {entity['id']} for {entity_type} '{entity_name}'")
                else:
                    # For special entity types, generate a deterministic UUID
                    if entity_type.lower() in ('championship', 'playoff', 'playoffs', 'tournament'):
                        import hashlib
                        from uuid import UUID
                        
                        # Generate UUID based on entity type and name
                        name_hash = hashlib.md5(f"{entity_type}:{entity_name}".encode()).hexdigest()
                        generated_uuid = UUID(name_hash[:32])
                        logger.info(f"Generated UUID {generated_uuid} for {entity_type}: {entity_name}")
                        service_update.entity_id = generated_uuid
                    else:
                        # Try to find in any of the supported entity types
                        found_entity = False
                        
                        # Skip lookups if we're already checking division_conference
                        if entity_type.lower() != 'division_conference':
                            # Try division_conference first
                            logger.info(f"Trying to find entity '{entity_name}' as a division_conference")
                            div_conf_entity = await sports_service.get_entity_by_name(db, "division_conference", entity_name)
                            if div_conf_entity:
                                logger.info(f"Found as division_conference with ID {div_conf_entity['id']}")
                                # Change entity type to division_conference since we found it there
                                service_update.entity_type = "division_conference"
                                service_update.entity_id = div_conf_entity["id"]
                                found_entity = True
                        
                        # Try looking up as a league as a fallback if not found yet
                        if not found_entity:
                            logger.info(f"Trying to find entity '{entity_name}' as a league")
                            league_entity = await sports_service.get_entity_by_name(db, "league", entity_name)
                            if league_entity:
                                logger.info(f"Found as league with ID {league_entity['id']}")
                                # Change entity type to league since we found it as a league
                                service_update.entity_type = "league"
                                service_update.entity_id = league_entity["id"]
                                found_entity = True
                                
                        # If still not found in any entity type, raise error
                        if not found_entity:
                            # No entity found, raise error
                            raise ValueError(f"No {entity_type} found with name '{entity_name}'")
        
        # Update the production service
        service = await sports_service.update_production_service(db, service_id, service_update)
        if not service:
            raise HTTPException(status_code=404, detail="Production service not found")
        return service
    except Exception as e:
        logger.error(f"Error updating production service: {str(e)}")
        raise

@router.delete("/production-services/{service_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_production_service(
    service_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Delete a specific production service."""
    success = await sports_service.delete_production_service(db, service_id)
    if not success:
        raise HTTPException(status_code=404, detail="Production service not found")
    return None

# Brand endpoints
@router.get("/brands", response_model=List[BrandRead])
async def get_brands(
    industry: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Get all brands, optionally filtered by industry."""
    return await sports_service.get_brands(db, industry)

@router.post("/brands", response_model=BrandRead, status_code=status.HTTP_201_CREATED)
async def create_brand(
    brand: BrandCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Create a new brand."""
    return await sports_service.create_brand(db, brand)

@router.get("/brands/{brand_id}", response_model=BrandRead)
async def get_brand(
    brand_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Get a specific brand by ID."""
    brand = await sports_service.get_brand(db, brand_id)
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")
    return brand

@router.put("/brands/{brand_id}", response_model=BrandRead)
async def update_brand(
    brand_id: UUID,
    brand_update: BrandUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Update a specific brand."""
    brand = await sports_service.update_brand(db, brand_id, brand_update)
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")
    return brand

@router.delete("/brands/{brand_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_brand(
    brand_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Delete a specific brand."""
    success = await sports_service.delete_brand(db, brand_id)
    if not success:
        raise HTTPException(status_code=404, detail="Brand not found")
    return None

# Brand Relationship endpoints have been removed
# The functionality has been integrated into the Brand model with partner fields

# Export endpoint
@router.post("/export", response_model=EntityExportResponse)
async def export_entities(
    export_request: EntityExportRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Export selected entities to Google Sheets."""
    # Log export request details for debugging
    print(f"Export request received - entity_type: {export_request.entity_type}")
    print(f"Export request received - entity_ids count: {len(export_request.entity_ids)}")
    print(f"Export request received - include_relationships: {export_request.include_relationships}")
    print(f"Export request received - visible_columns: {export_request.visible_columns}")
    print(f"Export request received - target_folder: {export_request.target_folder}")
    print(f"Export request received - file_name: {export_request.file_name}")
    print(f"Export request received - use_drive_picker: {export_request.use_drive_picker}")
    
    # If visible_columns is provided as an empty list, set it to None
    visible_columns = export_request.visible_columns
    if visible_columns is not None and len(visible_columns) == 0:
        print("Visible columns is an empty list, setting to None")
        visible_columns = None
    
    # Ensure we're passing a list of strings if visible_columns is provided
    if visible_columns is not None:
        visible_columns = [str(col) for col in visible_columns]
        print(f"Sanitized visible columns: {visible_columns}")
    
    # CRITICAL CHANGE: Always export ALL entities by setting export_all=True
    # This forces the export_service to query all entities regardless of the entity_ids provided
    return await export_service.export_sports_entities(
        db, 
        export_request.entity_type,
        export_request.entity_ids,
        export_request.include_relationships,
        current_user["id"],
        visible_columns,
        export_request.target_folder,
        export_all=True,  # Force exporting all entities, not just the paginated ones
        file_name=export_request.file_name,  # Pass the custom file name
        use_drive_picker=export_request.use_drive_picker  # Pass the option to use Drive picker
    ) 