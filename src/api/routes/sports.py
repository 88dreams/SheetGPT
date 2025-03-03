from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import List, Optional, Dict, Any
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.sports_models import (
    League, Team, Player, Game, Stadium, 
    BroadcastCompany, BroadcastRights, 
    ProductionCompany, ProductionService,
    Brand, BrandRelationship
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
    ProductionServiceCreate, ProductionServiceUpdate, ProductionServiceResponse,
    BrandCreate, BrandUpdate, BrandResponse,
    BrandRelationshipCreate, BrandRelationshipUpdate, BrandRelationshipResponse,
    EntityExportRequest, EntityExportResponse
)
from src.utils.database import get_db
from src.services.sports_service import SportsService
from src.services.export_service import ExportService
from src.utils.auth import get_current_user
from src.schemas.common import PaginatedResponse

router = APIRouter()
sports_service = SportsService()
export_service = ExportService()

# Generic entity endpoints
@router.get("/entities/{entity_type}", response_model=PaginatedResponse[Dict[str, Any]])
async def get_entities(
    entity_type: str,
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=100, description="Items per page"),
    sort_by: str = Query("id", description="Field to sort by"),
    sort_direction: str = Query("asc", description="Sort direction (asc or desc)"),
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Get paginated entities of a specific type."""
    try:
        return await sports_service.get_entities(
            db=db,
            entity_type=entity_type,
            page=page,
            limit=limit,
            sort_by=sort_by,
            sort_direction=sort_direction
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# League endpoints
@router.get("/leagues", response_model=List[LeagueResponse])
async def get_leagues(
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Get all leagues."""
    return await sports_service.get_leagues(db)

@router.post("/leagues", response_model=LeagueResponse, status_code=status.HTTP_201_CREATED)
async def create_league(
    league: LeagueCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Create a new league."""
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
    team: TeamCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Create a new team."""
    return await sports_service.create_team(db, team)

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
    return await sports_service.get_players(db, team_id)

@router.post("/players", response_model=PlayerResponse, status_code=status.HTTP_201_CREATED)
async def create_player(
    player: PlayerCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Create a new player."""
    return await sports_service.create_player(db, player)

@router.get("/players/{player_id}", response_model=PlayerResponse)
async def get_player(
    player_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Get a specific player by ID."""
    player = await sports_service.get_player(db, player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    return player

@router.put("/players/{player_id}", response_model=PlayerResponse)
async def update_player(
    player_id: UUID,
    player_update: PlayerUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Update a specific player."""
    player = await sports_service.update_player(db, player_id, player_update)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    return player

@router.delete("/players/{player_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_player(
    player_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Delete a specific player."""
    success = await sports_service.delete_player(db, player_id)
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
    return await sports_service.get_games(db, league_id, team_id, season_year)

@router.post("/games", response_model=GameResponse, status_code=status.HTTP_201_CREATED)
async def create_game(
    game: GameCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Create a new game."""
    return await sports_service.create_game(db, game)

@router.get("/games/{game_id}", response_model=GameResponse)
async def get_game(
    game_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Get a specific game by ID."""
    game = await sports_service.get_game(db, game_id)
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
    game = await sports_service.update_game(db, game_id, game_update)
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
    success = await sports_service.delete_game(db, game_id)
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
    """Create a new stadium."""
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
    """Get all broadcast companies."""
    return await sports_service.get_broadcast_companies(db)

@router.post("/broadcast-companies", response_model=BroadcastCompanyResponse, status_code=status.HTTP_201_CREATED)
async def create_broadcast_company(
    broadcast_company: BroadcastCompanyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Create a new broadcast company."""
    return await sports_service.create_broadcast_company(db, broadcast_company)

@router.get("/broadcast-companies/{company_id}", response_model=BroadcastCompanyResponse)
async def get_broadcast_company(
    company_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Get a specific broadcast company by ID."""
    company = await sports_service.get_broadcast_company(db, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Broadcast company not found")
    return company

@router.put("/broadcast-companies/{company_id}", response_model=BroadcastCompanyResponse)
async def update_broadcast_company(
    company_id: UUID,
    company_update: BroadcastCompanyUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Update a specific broadcast company."""
    company = await sports_service.update_broadcast_company(db, company_id, company_update)
    if not company:
        raise HTTPException(status_code=404, detail="Broadcast company not found")
    return company

@router.delete("/broadcast-companies/{company_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_broadcast_company(
    company_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Delete a specific broadcast company."""
    success = await sports_service.delete_broadcast_company(db, company_id)
    if not success:
        raise HTTPException(status_code=404, detail="Broadcast company not found")
    return None

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
    return await sports_service.create_broadcast_rights(db, broadcast_rights)

@router.get("/broadcast-rights/{rights_id}", response_model=BroadcastRightsResponse)
async def get_broadcast_rights_by_id(
    rights_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Get specific broadcast rights by ID."""
    rights = await sports_service.get_broadcast_rights_by_id(db, rights_id)
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
    """Get all production companies."""
    return await sports_service.get_production_companies(db)

@router.post("/production-companies", response_model=ProductionCompanyResponse, status_code=status.HTTP_201_CREATED)
async def create_production_company(
    production_company: ProductionCompanyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Create a new production company."""
    return await sports_service.create_production_company(db, production_company)

@router.get("/production-companies/{company_id}", response_model=ProductionCompanyResponse)
async def get_production_company(
    company_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Get a specific production company by ID."""
    company = await sports_service.get_production_company(db, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Production company not found")
    return company

@router.put("/production-companies/{company_id}", response_model=ProductionCompanyResponse)
async def update_production_company(
    company_id: UUID,
    company_update: ProductionCompanyUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Update a specific production company."""
    company = await sports_service.update_production_company(db, company_id, company_update)
    if not company:
        raise HTTPException(status_code=404, detail="Production company not found")
    return company

@router.delete("/production-companies/{company_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_production_company(
    company_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Delete a specific production company."""
    success = await sports_service.delete_production_company(db, company_id)
    if not success:
        raise HTTPException(status_code=404, detail="Production company not found")
    return None

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
    """Create a new production service."""
    return await sports_service.create_production_service(db, production_service)

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
    """Update a specific production service."""
    service = await sports_service.update_production_service(db, service_id, service_update)
    if not service:
        raise HTTPException(status_code=404, detail="Production service not found")
    return service

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
@router.get("/brands", response_model=List[BrandResponse])
async def get_brands(
    industry: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Get all brands, optionally filtered by industry."""
    return await sports_service.get_brands(db, industry)

@router.post("/brands", response_model=BrandResponse, status_code=status.HTTP_201_CREATED)
async def create_brand(
    brand: BrandCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Create a new brand."""
    return await sports_service.create_brand(db, brand)

@router.get("/brands/{brand_id}", response_model=BrandResponse)
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

@router.put("/brands/{brand_id}", response_model=BrandResponse)
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

# Brand Relationship endpoints
@router.get("/brand-relationships", response_model=List[BrandRelationshipResponse])
async def get_brand_relationships(
    brand_id: Optional[UUID] = None,
    entity_type: Optional[str] = None,
    entity_id: Optional[UUID] = None,
    relationship_type: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Get all brand relationships, optionally filtered by brand, entity, or relationship type."""
    return await sports_service.get_brand_relationships(db, brand_id, entity_type, entity_id, relationship_type)

@router.post("/brand-relationships", response_model=BrandRelationshipResponse, status_code=status.HTTP_201_CREATED)
async def create_brand_relationship(
    relationship: BrandRelationshipCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Create a new brand relationship."""
    return await sports_service.create_brand_relationship(db, relationship)

@router.get("/brand-relationships/{relationship_id}", response_model=BrandRelationshipResponse)
async def get_brand_relationship(
    relationship_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Get a specific brand relationship by ID."""
    relationship = await sports_service.get_brand_relationship(db, relationship_id)
    if not relationship:
        raise HTTPException(status_code=404, detail="Brand relationship not found")
    return relationship

@router.put("/brand-relationships/{relationship_id}", response_model=BrandRelationshipResponse)
async def update_brand_relationship(
    relationship_id: UUID,
    relationship_update: BrandRelationshipUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Update a specific brand relationship."""
    relationship = await sports_service.update_brand_relationship(db, relationship_id, relationship_update)
    if not relationship:
        raise HTTPException(status_code=404, detail="Brand relationship not found")
    return relationship

@router.delete("/brand-relationships/{relationship_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_brand_relationship(
    relationship_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Delete a specific brand relationship."""
    success = await sports_service.delete_brand_relationship(db, relationship_id)
    if not success:
        raise HTTPException(status_code=404, detail="Brand relationship not found")
    return None

# Export endpoint
@router.post("/export", response_model=EntityExportResponse)
async def export_entities(
    export_request: EntityExportRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Export selected entities to Google Sheets."""
    return await export_service.export_sports_entities(
        db, 
        export_request.entity_type,
        export_request.entity_ids,
        export_request.include_relationships,
        current_user["id"]
    ) 