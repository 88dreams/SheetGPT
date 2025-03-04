from sqlalchemy.orm import Session
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import SQLAlchemyError
from typing import List, Optional, Dict, Any, Type
from uuid import UUID
import logging
from sqlalchemy import select, delete, update, or_
from sqlalchemy.future import select
from sqlalchemy import func
import math
from sqlalchemy import text
from datetime import date
from uuid import uuid4

from src.models.sports_models import (
    League, Team, Player, Game, Stadium, 
    BroadcastCompany, BroadcastRights, 
    ProductionCompany, ProductionService,
    Brand, BrandRelationship,
    GameBroadcast, LeagueExecutive,
    TeamRecord, TeamOwnership
)
from src.schemas.sports import (
    LeagueCreate, LeagueUpdate,
    TeamCreate, TeamUpdate,
    PlayerCreate, PlayerUpdate,
    GameCreate, GameUpdate,
    StadiumCreate, StadiumUpdate,
    BroadcastCompanyCreate, BroadcastCompanyUpdate,
    BroadcastRightsCreate, BroadcastRightsUpdate,
    ProductionCompanyCreate, ProductionCompanyUpdate,
    ProductionServiceCreate, ProductionServiceUpdate,
    BrandCreate, BrandUpdate,
    BrandRelationshipCreate, BrandRelationshipUpdate,
    GameBroadcastCreate, GameBroadcastUpdate,
    LeagueExecutiveCreate, LeagueExecutiveUpdate
)

logger = logging.getLogger(__name__)

class SportsService:
    """Service for managing sports entities."""

    # Entity type mapping
    ENTITY_TYPES = {
        # Plural forms (original)
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
        # Singular forms (added for frontend compatibility)
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
        # Additional mappings for frontend entity types
        "broadcast": BroadcastCompany,
        "production": ProductionCompany
    }

    async def get_entities(self, db: AsyncSession, entity_type: str, page: int = 1, limit: int = 50, sort_by: str = "id", sort_direction: str = "asc") -> Dict[str, Any]:
        """Get paginated entities of a specific type."""
        if entity_type not in self.ENTITY_TYPES:
            raise ValueError(f"Invalid entity type: {entity_type}")
        
        model_class = self.ENTITY_TYPES[entity_type]
        
        # Get total count
        count_query = select(func.count()).select_from(model_class)
        total_count = await db.scalar(count_query)
        
        # Get paginated results
        query = select(model_class)
        
        # Add sorting
        if hasattr(model_class, sort_by):
            sort_column = getattr(model_class, sort_by)
            if sort_direction.lower() == "desc":
                query = query.order_by(sort_column.desc())
            else:
                query = query.order_by(sort_column.asc())
                
        # Add pagination
        query = query.offset((page - 1) * limit).limit(limit)
        
        result = await db.execute(query)
        entities = result.scalars().all()
        
        return {
            "items": [self._model_to_dict(entity) for entity in entities],
            "total": total_count,
            "page": page,
            "page_size": limit,
            "total_pages": math.ceil(total_count / limit)
        }

    def _model_to_dict(self, model: Any) -> Dict[str, Any]:
        """Convert a model instance to a dictionary."""
        result = {}
        for column in model.__table__.columns:
            result[column.name] = getattr(model, column.name)
        return result

    # League methods
    async def get_leagues(self, db: AsyncSession) -> List[League]:
        """Get all leagues."""
        result = await db.execute(select(League))
        return result.scalars().all()

    async def create_league(self, db: AsyncSession, league: LeagueCreate) -> League:
        """Create a new league."""
        db_league = League(**league.dict())
        db.add(db_league)
        await db.commit()
        await db.refresh(db_league)
        return db_league

    async def get_league(self, db: AsyncSession, league_id: UUID) -> Optional[League]:
        """Get a league by ID."""
        result = await db.execute(select(League).where(League.id == league_id))
        return result.scalars().first()

    async def update_league(self, db: AsyncSession, league_id: UUID, league_update: LeagueUpdate) -> Optional[League]:
        """Update a league."""
        result = await db.execute(select(League).where(League.id == league_id))
        db_league = result.scalars().first()
        if not db_league:
            return None
        
        update_data = league_update.dict(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_league, key, value)
        
        try:
            await db.commit()
            await db.refresh(db_league)
            return db_league
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Error updating league: {str(e)}")
            raise

    async def delete_league(self, db: AsyncSession, league_id: UUID) -> bool:
        """Delete a league."""
        result = await db.execute(select(League).where(League.id == league_id))
        db_league = result.scalars().first()
        if not db_league:
            return False
        
        try:
            await db.delete(db_league)
            await db.commit()
            return True
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Error deleting league: {str(e)}")
            raise

    # Team methods
    async def get_teams(self, db: AsyncSession, league_id: Optional[UUID] = None) -> List[Team]:
        """Get all teams, optionally filtered by league."""
        query = select(Team)
        if league_id:
            query = query.where(Team.league_id == league_id)
        result = await db.execute(query)
        return result.scalars().all()

    async def create_team(self, db: AsyncSession, team: TeamCreate) -> Team:
        """Create a new team."""
        # First check if the league exists
        result = await db.execute(select(League).where(League.id == team.league_id))
        league = result.scalars().first()
        
        if not league:
            raise ValueError(f"League with ID {team.league_id} not found")
        
        # Create the team
        db_team = Team(**team.dict())
        db.add(db_team)
        await db.commit()
        await db.refresh(db_team)
        return db_team

    async def get_team(self, db: AsyncSession, team_id: UUID) -> Optional[Team]:
        """Get a team by ID."""
        result = await db.execute(select(Team).where(Team.id == team_id))
        return result.scalars().first()

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
            league_result = await db.execute(select(League).where(League.id == update_data['league_id']))
            league = league_result.scalars().first()
            if not league:
                raise ValueError(f"League with ID {update_data['league_id']} not found")
        
        # Validate stadium_id if it's being updated
        if 'stadium_id' in update_data:
            stadium_result = await db.execute(select(Stadium).where(Stadium.id == update_data['stadium_id']))
            stadium = stadium_result.scalars().first()
            if not stadium:
                raise ValueError(f"Stadium with ID {update_data['stadium_id']} not found")
        
        # Apply updates
        for key, value in update_data.items():
            setattr(db_team, key, value)
        
        await db.commit()
        await db.refresh(db_team)
        return db_team

    async def delete_team(self, db: AsyncSession, team_id: UUID) -> bool:
        """Delete a team."""
        # First check if the team exists
        result = await db.execute(select(Team).where(Team.id == team_id))
        db_team = result.scalars().first()
        
        if not db_team:
            return False
        
        # Delete the team
        await db.delete(db_team)
        await db.commit()
        return True

    # Similar methods would be implemented for other entity types
    # (Player, Game, Stadium, BroadcastCompany, BroadcastRights, etc.)
    # following the same pattern as above 
    # Player methods
        
    async def get_players(self, db: AsyncSession, team_id: Optional[UUID] = None) -> List[Player]:
        """Get all players, optionally filtered by team."""
        query = select(Player)
        if team_id:
            query = query.where(Player.team_id == team_id)
        result = await db.execute(query)
        return result.scalars().all()

    async def create_player(self, db: AsyncSession, player: PlayerCreate) -> Player:
        """Create a new player."""
        # First check if the team exists
        result = await db.execute(select(Team).where(Team.id == player.team_id))
        team = result.scalars().first()
        
        if not team:
            raise ValueError(f"Team with ID {player.team_id} not found")
        
        # Create the player
        db_player = Player(**player.dict())
        db.add(db_player)
        await db.commit()
        await db.refresh(db_player)
        return db_player

    async def get_player(self, db: AsyncSession, player_id: UUID) -> Optional[Player]:
        """Get a player by ID."""
        result = await db.execute(select(Player).where(Player.id == player_id))
        return result.scalars().first()

    async def update_player(self, db: AsyncSession, player_id: UUID, player_update: PlayerUpdate) -> Optional[Player]:
        """Update a player."""
        # First get the player
        result = await db.execute(select(Player).where(Player.id == player_id))
        db_player = result.scalars().first()
        
        if not db_player:
            return None
        
        # Update player attributes
        update_data = player_update.dict(exclude_unset=True)
        
        # Validate team_id if it's being updated
        if 'team_id' in update_data:
            team_result = await db.execute(select(Team).where(Team.id == update_data['team_id']))
            team = team_result.scalars().first()
            if not team:
                raise ValueError(f"Team with ID {update_data['team_id']} not found")
        
        # Apply updates
        for key, value in update_data.items():
            setattr(db_player, key, value)
        
        await db.commit()
        await db.refresh(db_player)
        return db_player

    async def delete_player(self, db: AsyncSession, player_id: UUID) -> bool:
        """Delete a player."""
        # First check if the player exists
        result = await db.execute(select(Player).where(Player.id == player_id))
        db_player = result.scalars().first()
        
        if not db_player:
            return False
        
        # Delete the player
        await db.delete(db_player)
        await db.commit()
        return True

    # Game methods
    async def get_games(self, db: AsyncSession, league_id: Optional[UUID] = None, 
                    team_id: Optional[UUID] = None, season_year: Optional[int] = None) -> List[Game]:
        """Get all games, optionally filtered by league, team, or season."""
        query = select(Game)
        if league_id:
            query = query.where(Game.league_id == league_id)
        if team_id:
            query = query.where((Game.home_team_id == team_id) | (Game.away_team_id == team_id))
        if season_year:
            query = query.where(Game.season_year == season_year)
        result = await db.execute(query)
        return result.scalars().all()

    async def create_game(self, db: AsyncSession, game: GameCreate) -> Game:
        """Create a new game."""
        # Validate that the league, teams, and stadium exist
        league_result = await db.execute(select(League).where(League.id == game.league_id))
        league = league_result.scalars().first()
        if not league:
            raise ValueError(f"League with ID {game.league_id} not found")
        
        home_team_result = await db.execute(select(Team).where(Team.id == game.home_team_id))
        home_team = home_team_result.scalars().first()
        if not home_team:
            raise ValueError(f"Home team with ID {game.home_team_id} not found")
        
        away_team_result = await db.execute(select(Team).where(Team.id == game.away_team_id))
        away_team = away_team_result.scalars().first()
        if not away_team:
            raise ValueError(f"Away team with ID {game.away_team_id} not found")
        
        stadium_result = await db.execute(select(Stadium).where(Stadium.id == game.stadium_id))
        stadium = stadium_result.scalars().first()
        if not stadium:
            raise ValueError(f"Stadium with ID {game.stadium_id} not found")

        db_game = Game(**game.dict())
        try:
            db.add(db_game)
            await db.commit()
            await db.refresh(db_game)
            return db_game
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Error creating game: {str(e)}")
            raise

    async def get_game(self, db: AsyncSession, game_id: UUID) -> Optional[Game]:
        """Get a specific game by ID."""
        result = await db.execute(select(Game).where(Game.id == game_id))
        return result.scalars().first()

    async def update_game(self, db: AsyncSession, game_id: UUID, game_update: GameUpdate) -> Optional[Game]:
        """Update a specific game."""
        result = await db.execute(select(Game).where(Game.id == game_id))
        db_game = result.scalars().first()
        if not db_game:
            return None

        update_data = game_update.dict(exclude_unset=True)
        
        # Validate foreign keys if they are being updated
        if 'league_id' in update_data:
            league_result = await db.execute(select(League).where(League.id == update_data['league_id']))
            league = league_result.scalars().first()
            if not league:
                raise ValueError(f"League with ID {update_data['league_id']} not found")
        
        if 'home_team_id' in update_data:
            home_team_result = await db.execute(select(Team).where(Team.id == update_data['home_team_id']))
            home_team = home_team_result.scalars().first()
            if not home_team:
                raise ValueError(f"Home team with ID {update_data['home_team_id']} not found")
        
        if 'away_team_id' in update_data:
            away_team_result = await db.execute(select(Team).where(Team.id == update_data['away_team_id']))
            away_team = away_team_result.scalars().first()
            if not away_team:
                raise ValueError(f"Away team with ID {update_data['away_team_id']} not found")
        
        if 'stadium_id' in update_data:
            stadium_result = await db.execute(select(Stadium).where(Stadium.id == update_data['stadium_id']))
            stadium = stadium_result.scalars().first()
            if not stadium:
                raise ValueError(f"Stadium with ID {update_data['stadium_id']} not found")

        for key, value in update_data.items():
            setattr(db_game, key, value)

        try:
            await db.commit()
            await db.refresh(db_game)
            return db_game
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Error updating game: {str(e)}")
            raise

    async def delete_game(self, db: AsyncSession, game_id: UUID) -> bool:
        """Delete a specific game."""
        result = await db.execute(select(Game).where(Game.id == game_id))
        db_game = result.scalars().first()
        if not db_game:
            return False

        try:
            await db.delete(db_game)
            await db.commit()
            return True
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Error deleting game: {str(e)}")
            raise

    # Stadium methods
    async def get_stadiums(self, db: AsyncSession) -> List[Stadium]:
        """Get all stadiums."""
        query = select(Stadium)
        result = await db.execute(query)
        return result.scalars().all()

    async def create_stadium(self, db: AsyncSession, stadium: StadiumCreate) -> Stadium:
        """Create a new stadium."""
        db_stadium = Stadium(
            name=stadium.name,
            city=stadium.city,
            state=stadium.state,
            country=stadium.country,
            capacity=stadium.capacity,
            owner=stadium.owner,
            naming_rights_holder=stadium.naming_rights_holder,
            host_broadcaster_id=stadium.host_broadcaster_id
        )
        
        try:
            db.add(db_stadium)
            await db.commit()
            await db.refresh(db_stadium)
            return db_stadium
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Error creating stadium: {str(e)}")
            raise

    async def get_stadium(self, db: AsyncSession, stadium_id: UUID) -> Optional[Stadium]:
        """Get a specific stadium by ID."""
        result = await db.execute(select(Stadium).where(Stadium.id == stadium_id))
        return result.scalars().first()

    async def update_stadium(self, db: AsyncSession, stadium_id: UUID, stadium_update: StadiumUpdate) -> Optional[Stadium]:
        """Update a specific stadium."""
        # Get the stadium
        result = await db.execute(select(Stadium).where(Stadium.id == stadium_id))
        db_stadium = result.scalars().first()
        if not db_stadium:
            return None
        
        # Update the stadium
        update_data = stadium_update.dict(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_stadium, key, value)
        
        try:
            await db.commit()
            await db.refresh(db_stadium)
            return db_stadium
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Error updating stadium: {str(e)}")
            raise

    async def delete_stadium(self, db: AsyncSession, stadium_id: UUID) -> bool:
        """Delete a specific stadium."""
        # Get the stadium
        result = await db.execute(select(Stadium).where(Stadium.id == stadium_id))
        db_stadium = result.scalars().first()
        if not db_stadium:
            return False
        
        # Delete the stadium
        await db.delete(db_stadium)
        await db.commit()
        return True
        
    # BroadcastCompany methods
    async def get_broadcast_companies(self, db: AsyncSession) -> List[BroadcastCompany]:
        """Get all broadcast companies."""
        query = select(BroadcastCompany)
        result = await db.execute(query)
        return result.scalars().all()

    async def create_broadcast_company(self, db: AsyncSession, broadcast_company: BroadcastCompanyCreate) -> BroadcastCompany:
        """Create a new broadcast company."""
        db_broadcast_company = BroadcastCompany(
            name=broadcast_company.name,
            type=broadcast_company.type,
            country=broadcast_company.country
        )
        
        try:
            db.add(db_broadcast_company)
            await db.commit()
            await db.refresh(db_broadcast_company)
            return db_broadcast_company
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Error creating broadcast company: {str(e)}")
            raise

    async def get_broadcast_company(self, db: AsyncSession, broadcast_company_id: UUID) -> Optional[BroadcastCompany]:
        """Get a specific broadcast company by ID."""
        result = await db.execute(select(BroadcastCompany).where(BroadcastCompany.id == broadcast_company_id))
        return result.scalars().first()

    async def update_broadcast_company(self, db: AsyncSession, broadcast_company_id: UUID, 
                                    broadcast_company_update: BroadcastCompanyUpdate) -> Optional[BroadcastCompany]:
        """Update a specific broadcast company."""
        # Get the broadcast company
        result = await db.execute(select(BroadcastCompany).where(BroadcastCompany.id == broadcast_company_id))
        db_broadcast_company = result.scalars().first()
        if not db_broadcast_company:
            return None
        
        # Update the broadcast company
        update_data = broadcast_company_update.dict(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_broadcast_company, key, value)
        
        try:
            await db.commit()
            await db.refresh(db_broadcast_company)
            return db_broadcast_company
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Error updating broadcast company: {str(e)}")
            raise

    async def delete_broadcast_company(self, db: AsyncSession, broadcast_company_id: UUID) -> bool:
        """Delete a specific broadcast company."""
        # Get the broadcast company
        result = await db.execute(select(BroadcastCompany).where(BroadcastCompany.id == broadcast_company_id))
        db_broadcast_company = result.scalars().first()
        if not db_broadcast_company:
            return False
        
        # Delete the broadcast company
        await db.delete(db_broadcast_company)
        await db.commit()
        return True

    # BroadcastRights methods
    async def get_broadcast_rights(self, db: AsyncSession, entity_id: Optional[UUID] = None, 
                                broadcast_company_id: Optional[UUID] = None) -> List[BroadcastRights]:
        """Get all broadcast rights, optionally filtered by entity or broadcast company."""
        query = select(BroadcastRights)
        if entity_id:
            query = query.where(BroadcastRights.entity_id == entity_id)
        if broadcast_company_id:
            query = query.where(BroadcastRights.broadcast_company_id == broadcast_company_id)
        result = await db.execute(query)
        return result.scalars().all()

    async def create_broadcast_rights(self, db: AsyncSession, broadcast_rights: BroadcastRightsCreate) -> BroadcastRights:
        """Create new broadcast rights."""
        # Validate that the broadcast company exists
        broadcast_company_result = await db.execute(select(BroadcastCompany).where(
            BroadcastCompany.id == broadcast_rights.broadcast_company_id
        ))
        broadcast_company = broadcast_company_result.scalars().first()
        if not broadcast_company:
            raise ValueError(f"Broadcast company with ID {broadcast_rights.broadcast_company_id} not found")
        
        # Validate entity exists (could be a league, team, or game)
        # This would require more complex validation based on entity_type
        
        db_broadcast_rights = BroadcastRights(**broadcast_rights.dict())
        try:
            db.add(db_broadcast_rights)
            await db.commit()
            await db.refresh(db_broadcast_rights)
            return db_broadcast_rights
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Error creating broadcast rights: {str(e)}")
            raise

    async def get_broadcast_right(self, db: AsyncSession, broadcast_rights_id: UUID) -> Optional[BroadcastRights]:
        """Get specific broadcast rights by ID."""
        result = await db.execute(select(BroadcastRights).where(BroadcastRights.id == broadcast_rights_id))
        return result.scalars().first()

    async def update_broadcast_rights(self, db: AsyncSession, broadcast_rights_id: UUID, 
                                    broadcast_rights_update: BroadcastRightsUpdate) -> Optional[BroadcastRights]:
        """Update specific broadcast rights."""
        db_broadcast_rights = await self.get_broadcast_right(db, broadcast_rights_id)
        if not db_broadcast_rights:
            return None

        update_data = broadcast_rights_update.dict(exclude_unset=True)
        
        # Validate broadcast_company_id if it's being updated
        if 'broadcast_company_id' in update_data:
            broadcast_company_result = await db.execute(select(BroadcastCompany).where(
                BroadcastCompany.id == update_data['broadcast_company_id']
            ))
            broadcast_company = broadcast_company_result.scalars().first()
            if not broadcast_company:
                raise ValueError(f"Broadcast company with ID {update_data['broadcast_company_id']} not found")
        
        for key, value in update_data.items():
            setattr(db_broadcast_rights, key, value)

        try:
            await db.commit()
            await db.refresh(db_broadcast_rights)
            return db_broadcast_rights
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Error updating broadcast rights: {str(e)}")
            raise

    async def delete_broadcast_rights(self, db: AsyncSession, broadcast_rights_id: UUID) -> bool:
        """Delete specific broadcast rights."""
        db_broadcast_rights = await self.get_broadcast_right(db, broadcast_rights_id)
        if not db_broadcast_rights:
            return False

        try:
            await db.delete(db_broadcast_rights)
            await db.commit()
            return True
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Error deleting broadcast rights: {str(e)}")
            raise

    # ProductionCompany methods
    async def get_production_companies(self, db: AsyncSession) -> List[ProductionCompany]:
        """Get all production companies."""
        query = select(ProductionCompany)
        result = await db.execute(query)
        return result.scalars().all()

    async def create_production_company(self, db: AsyncSession, production_company: ProductionCompanyCreate) -> ProductionCompany:
        """Create a new production company."""
        db_production_company = ProductionCompany(
            name=production_company.name
        )
        
        try:
            db.add(db_production_company)
            await db.commit()
            await db.refresh(db_production_company)
            return db_production_company
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Error creating production company: {str(e)}")
            raise

    async def get_production_company(self, db: AsyncSession, production_company_id: UUID) -> Optional[ProductionCompany]:
        """Get a specific production company by ID."""
        result = await db.execute(select(ProductionCompany).where(ProductionCompany.id == production_company_id))
        return result.scalars().first()

    async def update_production_company(self, db: AsyncSession, production_company_id: UUID, 
                                    production_company_update: ProductionCompanyUpdate) -> Optional[ProductionCompany]:
        """Update a production company."""
        # Get the production company
        result = await db.execute(select(ProductionCompany).where(ProductionCompany.id == production_company_id))
        db_production_company = result.scalars().first()
        if not db_production_company:
            return None
        
        # Update the production company
        update_data = production_company_update.dict(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_production_company, key, value)
        
        try:
            await db.commit()
            await db.refresh(db_production_company)
            return db_production_company
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Error updating production company: {str(e)}")
            raise

    async def delete_production_company(self, db: AsyncSession, production_company_id: UUID) -> bool:
        """Delete a production company."""
        # Get the production company
        result = await db.execute(select(ProductionCompany).where(ProductionCompany.id == production_company_id))
        db_production_company = result.scalars().first()
        if not db_production_company:
            return False
        
        # Delete the production company
        await db.delete(db_production_company)
        await db.commit()
        return True

    # ProductionService methods
    async def get_production_services(self, db: AsyncSession, entity_id: Optional[UUID] = None, 
                                    production_company_id: Optional[UUID] = None) -> List[ProductionService]:
        """Get all production services, optionally filtered by entity or production company."""
        query = select(ProductionService)
        if entity_id:
            query = query.where(ProductionService.entity_id == entity_id)
        if production_company_id:
            query = query.where(ProductionService.production_company_id == production_company_id)
        result = await db.execute(query)
        return result.scalars().all()

    async def create_production_service(self, db: AsyncSession, production_service: ProductionServiceCreate) -> ProductionService:
        """Create a new production service."""
        # Validate that the production company exists
        result = await db.execute(select(ProductionCompany).where(ProductionCompany.id == production_service.production_company_id))
        production_company = result.scalars().first()
        if not production_company:
            raise ValueError(f"Production company with ID {production_service.production_company_id} not found")
        
        # Create the production service
        db_production_service = ProductionService(
            entity_type=production_service.entity_type,
            entity_id=production_service.entity_id,
            production_company_id=production_service.production_company_id,
            service_type=production_service.service_type,
            start_date=production_service.start_date,
            end_date=production_service.end_date
        )
        
        try:
            db.add(db_production_service)
            await db.commit()
            await db.refresh(db_production_service)
            return db_production_service
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Error creating production service: {str(e)}")
            raise

    async def get_production_service(self, db: AsyncSession, production_service_id: UUID) -> Optional[ProductionService]:
        """Get a specific production service by ID."""
        result = await db.execute(select(ProductionService).where(ProductionService.id == production_service_id))
        return result.scalars().first()

    async def update_production_service(self, db: AsyncSession, production_service_id: UUID, 
                                    production_service_update: ProductionServiceUpdate) -> Optional[ProductionService]:
        """Update a production service."""
        # Get the production service
        result = await db.execute(select(ProductionService).where(ProductionService.id == production_service_id))
        db_production_service = result.scalars().first()
        if not db_production_service:
            return None
        
        # Validate production company if it's being updated
        if production_service_update.production_company_id:
            result = await db.execute(select(ProductionCompany).where(ProductionCompany.id == production_service_update.production_company_id))
            production_company = result.scalars().first()
            if not production_company:
                raise ValueError(f"Production company with ID {production_service_update.production_company_id} not found")
        
        # Update the production service
        update_data = production_service_update.dict(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_production_service, key, value)
        
        try:
            await db.commit()
            await db.refresh(db_production_service)
            return db_production_service
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Error updating production service: {str(e)}")
            raise

    async def delete_production_service(self, db: AsyncSession, production_service_id: UUID) -> bool:
        """Delete a production service."""
        # Get the production service
        result = await db.execute(select(ProductionService).where(ProductionService.id == production_service_id))
        db_production_service = result.scalars().first()
        if not db_production_service:
            return False
        
        # Delete the production service
        await db.delete(db_production_service)
        await db.commit()
        return True

    # Brand methods
    async def get_brands(self, db: AsyncSession) -> List[Brand]:
        """Get all brands."""
        query = select(Brand)
        result = await db.execute(query)
        return result.scalars().all()

    async def create_brand(self, db: AsyncSession, brand: BrandCreate) -> Brand:
        """Create a new brand."""
        db_brand = Brand(
            name=brand.name,
            industry=brand.industry
        )
        
        try:
            db.add(db_brand)
            await db.commit()
            await db.refresh(db_brand)
            return db_brand
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Error creating brand: {str(e)}")
            raise

    async def get_brand(self, db: AsyncSession, brand_id: UUID) -> Optional[Brand]:
        """Get a specific brand by ID."""
        result = await db.execute(select(Brand).where(Brand.id == brand_id))
        return result.scalars().first()

    async def update_brand(self, db: AsyncSession, brand_id: UUID, brand_update: BrandUpdate) -> Optional[Brand]:
        """Update a brand."""
        # Get the brand
        result = await db.execute(select(Brand).where(Brand.id == brand_id))
        db_brand = result.scalars().first()
        if not db_brand:
            return None
        
        # Update the brand
        update_data = brand_update.dict(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_brand, key, value)
        
        try:
            await db.commit()
            await db.refresh(db_brand)
            return db_brand
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Error updating brand: {str(e)}")
            raise

    async def delete_brand(self, db: AsyncSession, brand_id: UUID) -> bool:
        """Delete a brand."""
        # Get the brand
        result = await db.execute(select(Brand).where(Brand.id == brand_id))
        db_brand = result.scalars().first()
        if not db_brand:
            return False
        
        # Delete the brand
        await db.delete(db_brand)
        await db.commit()
        return True

    # BrandRelationship methods
    async def get_brand_relationships(self, db: AsyncSession, entity_id: Optional[UUID] = None, 
                                    brand_id: Optional[UUID] = None) -> List[BrandRelationship]:
        """Get all brand relationships, optionally filtered by entity or brand."""
        query = select(BrandRelationship)
        if entity_id:
            query = query.where(BrandRelationship.entity_id == entity_id)
        if brand_id:
            query = query.where(BrandRelationship.brand_id == brand_id)
        result = await db.execute(query)
        return result.scalars().all()

    async def create_brand_relationship(self, db: AsyncSession, brand_relationship: BrandRelationshipCreate) -> BrandRelationship:
        """Create a new brand relationship."""
        # Validate that the brand exists
        result = await db.execute(select(Brand).where(Brand.id == brand_relationship.brand_id))
        brand = result.scalars().first()
        if not brand:
            raise ValueError(f"Brand with ID {brand_relationship.brand_id} not found")
        
        # Create the brand relationship
        db_brand_relationship = BrandRelationship(
            brand_id=brand_relationship.brand_id,
            entity_type=brand_relationship.entity_type,
            entity_id=brand_relationship.entity_id,
            relationship_type=brand_relationship.relationship_type,
            start_date=brand_relationship.start_date,
            end_date=brand_relationship.end_date
        )
        
        try:
            db.add(db_brand_relationship)
            await db.commit()
            await db.refresh(db_brand_relationship)
            return db_brand_relationship
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Error creating brand relationship: {str(e)}")
            raise

    async def get_brand_relationship(self, db: AsyncSession, brand_relationship_id: UUID) -> Optional[BrandRelationship]:
        """Get a specific brand relationship by ID."""
        result = await db.execute(select(BrandRelationship).where(BrandRelationship.id == brand_relationship_id))
        return result.scalars().first()

    async def update_brand_relationship(self, db: AsyncSession, brand_relationship_id: UUID, 
                                    brand_relationship_update: BrandRelationshipUpdate) -> Optional[BrandRelationship]:
        """Update a brand relationship."""
        # Get the brand relationship
        result = await db.execute(select(BrandRelationship).where(BrandRelationship.id == brand_relationship_id))
        db_brand_relationship = result.scalars().first()
        if not db_brand_relationship:
            return None
        
        # Update the brand relationship
        update_data = brand_relationship_update.dict(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_brand_relationship, key, value)
        
        try:
            await db.commit()
            await db.refresh(db_brand_relationship)
            return db_brand_relationship
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Error updating brand relationship: {str(e)}")
            raise

    async def delete_brand_relationship(self, db: AsyncSession, brand_relationship_id: UUID) -> bool:
        """Delete a brand relationship."""
        # Get the brand relationship
        result = await db.execute(select(BrandRelationship).where(BrandRelationship.id == brand_relationship_id))
        db_brand_relationship = result.scalars().first()
        if not db_brand_relationship:
            return False
        
        # Delete the brand relationship
        await db.delete(db_brand_relationship)
        await db.commit()
        return True

    async def get_game_broadcasts(self, db: AsyncSession, game_id: Optional[UUID] = None, 
                             broadcast_company_id: Optional[UUID] = None) -> List[GameBroadcast]:
        """Get all game broadcasts, optionally filtered by game or broadcast company."""
        query = select(GameBroadcast)
        if game_id:
            query = query.where(GameBroadcast.game_id == game_id)
        if broadcast_company_id:
            query = query.where(GameBroadcast.broadcast_company_id == broadcast_company_id)
        result = await db.execute(query)
        return result.scalars().all()

    async def create_game_broadcast(self, db: AsyncSession, game_broadcast: GameBroadcastCreate) -> GameBroadcast:
        """Create a new game broadcast."""
        # Validate that the game exists
        result = await db.execute(select(Game).where(Game.id == game_broadcast.game_id))
        game = result.scalars().first()
        if not game:
            raise ValueError(f"Game with ID {game_broadcast.game_id} not found")
        
        # Validate that the broadcast company exists
        result = await db.execute(select(BroadcastCompany).where(BroadcastCompany.id == game_broadcast.broadcast_company_id))
        broadcast_company = result.scalars().first()
        if not broadcast_company:
            raise ValueError(f"Broadcast company with ID {game_broadcast.broadcast_company_id} not found")
        
        # Validate that the production company exists if provided
        if game_broadcast.production_company_id:
            result = await db.execute(select(ProductionCompany).where(ProductionCompany.id == game_broadcast.production_company_id))
            production_company = result.scalars().first()
            if not production_company:
                raise ValueError(f"Production company with ID {game_broadcast.production_company_id} not found")
        
        # Create the game broadcast
        db_game_broadcast = GameBroadcast(
            game_id=game_broadcast.game_id,
            broadcast_company_id=game_broadcast.broadcast_company_id,
            production_company_id=game_broadcast.production_company_id,
            broadcast_type=game_broadcast.broadcast_type,
            territory=game_broadcast.territory,
            start_time=game_broadcast.start_time,
            end_time=game_broadcast.end_time
        )
        
        try:
            db.add(db_game_broadcast)
            await db.commit()
            await db.refresh(db_game_broadcast)
            return db_game_broadcast
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Error creating game broadcast: {str(e)}")
            raise

    async def get_game_broadcast(self, db: AsyncSession, game_broadcast_id: UUID) -> Optional[GameBroadcast]:
        """Get a specific game broadcast by ID."""
        result = await db.execute(select(GameBroadcast).where(GameBroadcast.id == game_broadcast_id))
        return result.scalars().first()

    async def update_game_broadcast(self, db: AsyncSession, game_broadcast_id: UUID, 
                                game_broadcast_update: GameBroadcastUpdate) -> Optional[GameBroadcast]:
        """Update a game broadcast."""
        # Get the game broadcast
        result = await db.execute(select(GameBroadcast).where(GameBroadcast.id == game_broadcast_id))
        db_game_broadcast = result.scalars().first()
        if not db_game_broadcast:
            return None
        
        # Validate related entities if they are being updated
        update_data = game_broadcast_update.dict(exclude_unset=True)
        
        if "game_id" in update_data:
            result = await db.execute(select(Game).where(Game.id == update_data["game_id"]))
            game = result.scalars().first()
            if not game:
                raise ValueError(f"Game with ID {update_data['game_id']} not found")
        
        if "broadcast_company_id" in update_data:
            result = await db.execute(select(BroadcastCompany).where(BroadcastCompany.id == update_data["broadcast_company_id"]))
            broadcast_company = result.scalars().first()
            if not broadcast_company:
                raise ValueError(f"Broadcast company with ID {update_data['broadcast_company_id']} not found")
        
        if "production_company_id" in update_data and update_data["production_company_id"] is not None:
            result = await db.execute(select(ProductionCompany).where(ProductionCompany.id == update_data["production_company_id"]))
            production_company = result.scalars().first()
            if not production_company:
                raise ValueError(f"Production company with ID {update_data['production_company_id']} not found")
        
        # Update the game broadcast
        for key, value in update_data.items():
            setattr(db_game_broadcast, key, value)
        
        try:
            await db.commit()
            await db.refresh(db_game_broadcast)
            return db_game_broadcast
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Error updating game broadcast: {str(e)}")
            raise

    async def delete_game_broadcast(self, db: AsyncSession, game_broadcast_id: UUID) -> bool:
        """Delete a game broadcast."""
        # Get the game broadcast
        result = await db.execute(select(GameBroadcast).where(GameBroadcast.id == game_broadcast_id))
        db_game_broadcast = result.scalars().first()
        if not db_game_broadcast:
            return False
        
        # Delete the game broadcast
        await db.delete(db_game_broadcast)
        await db.commit()
        return True

    async def get_league_executives(self, db: AsyncSession, league_id: Optional[UUID] = None) -> List[LeagueExecutive]:
        """Get all league executives, optionally filtered by league."""
        query = select(LeagueExecutive)
        if league_id:
            query = query.where(LeagueExecutive.league_id == league_id)
        result = await db.execute(query)
        return result.scalars().all()

    async def create_league_executive(self, db: AsyncSession, league_executive: LeagueExecutiveCreate) -> LeagueExecutive:
        """Create a new league executive."""
        # Validate that the league exists
        result = await db.execute(select(League).where(League.id == league_executive.league_id))
        league = result.scalars().first()
        if not league:
            raise ValueError(f"League with ID {league_executive.league_id} not found")
        
        # Create the league executive
        db_league_executive = LeagueExecutive(
            league_id=league_executive.league_id,
            name=league_executive.name,
            position=league_executive.position,
            start_date=league_executive.start_date,
            end_date=league_executive.end_date
        )
        
        try:
            db.add(db_league_executive)
            await db.commit()
            await db.refresh(db_league_executive)
            return db_league_executive
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Error creating league executive: {str(e)}")
            raise

    async def get_league_executive(self, db: AsyncSession, league_executive_id: UUID) -> Optional[LeagueExecutive]:
        """Get a specific league executive by ID."""
        result = await db.execute(select(LeagueExecutive).where(LeagueExecutive.id == league_executive_id))
        return result.scalars().first()

    async def update_league_executive(self, db: AsyncSession, league_executive_id: UUID, 
                                  league_executive_update: LeagueExecutiveUpdate) -> Optional[LeagueExecutive]:
        """Update a league executive."""
        # Get the league executive
        result = await db.execute(select(LeagueExecutive).where(LeagueExecutive.id == league_executive_id))
        db_league_executive = result.scalars().first()
        if not db_league_executive:
            return None
        
        # Validate related entities if they are being updated
        update_data = league_executive_update.dict(exclude_unset=True)
        
        if "league_id" in update_data:
            result = await db.execute(select(League).where(League.id == update_data["league_id"]))
            league = result.scalars().first()
            if not league:
                raise ValueError(f"League with ID {update_data['league_id']} not found")
        
        # Update the league executive
        for key, value in update_data.items():
            setattr(db_league_executive, key, value)
        
        try:
            await db.commit()
            await db.refresh(db_league_executive)
            return db_league_executive
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Error updating league executive: {str(e)}")
            raise

    async def delete_league_executive(self, db: AsyncSession, league_executive_id: UUID) -> bool:
        """Delete a league executive."""
        # Get the league executive
        result = await db.execute(select(LeagueExecutive).where(LeagueExecutive.id == league_executive_id))
        db_league_executive = result.scalars().first()
        if not db_league_executive:
            return False
        
        # Delete the league executive
        await db.delete(db_league_executive)
        await db.commit()
        return True

    async def create_entity(self, entity_type: str, data: dict) -> Optional[UUID]:
        """Create a new entity in the database."""
        try:
            # Check for existing entity with the same name for stadium, league, and team
            if entity_type in ['stadium', 'league', 'team'] and 'name' in data:
                existing_entity = await self.db.execute(
                    text(f"""
                        SELECT id FROM {entity_type}s 
                        WHERE LOWER(name) = LOWER(:name)
                    """),
                    {"name": data["name"]}
                )
                result = existing_entity.first()
                if result:
                    # Return existing entity ID instead of creating a duplicate
                    return result[0]

            # If no existing entity found, proceed with creation
            entity_id = str(uuid4())
            now = date.today()
            data.update({
                "id": entity_id,
                "created_at": now,
                "updated_at": now
            })

            columns = ", ".join(data.keys())
            values = ", ".join(f":{key}" for key in data.keys())
            
            await self.db.execute(
                text(f"""
                    INSERT INTO {entity_type}s ({columns})
                    VALUES ({values})
                    ON CONFLICT (name) DO UPDATE 
                    SET updated_at = :updated_at
                    RETURNING id
                """),
                data
            )
            
            return UUID(entity_id)
        except Exception as e:
            logger.error(f"Error creating {entity_type}: {str(e)}")
            raise