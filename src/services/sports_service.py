from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from typing import List, Optional, Dict, Any, Type
from uuid import UUID
import logging

from src.models.sports_models import (
    League, Team, Player, Game, Stadium, 
    BroadcastCompany, BroadcastRights, 
    ProductionCompany, ProductionService,
    Brand, BrandRelationship
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
    BrandRelationshipCreate, BrandRelationshipUpdate
)

logger = logging.getLogger(__name__)

class SportsService:
    """Service for managing sports entities."""

    # Entity type mapping
    ENTITY_TYPES = {
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
        "brand_relationships": BrandRelationship
    }

    async def get_entities(self, db: Session, entity_type: str) -> List[Dict[str, Any]]:
        """Get all entities of a specific type."""
        if entity_type not in self.ENTITY_TYPES:
            raise ValueError(f"Invalid entity type: {entity_type}")
        
        model = self.ENTITY_TYPES[entity_type]
        entities = db.query(model).all()
        return [self._model_to_dict(entity) for entity in entities]

    def _model_to_dict(self, model: Any) -> Dict[str, Any]:
        """Convert a model instance to a dictionary."""
        result = {}
        for column in model.__table__.columns:
            result[column.name] = getattr(model, column.name)
        return result

    # League methods
    async def get_leagues(self, db: Session) -> List[League]:
        """Get all leagues."""
        return db.query(League).all()

    async def create_league(self, db: Session, league: LeagueCreate) -> League:
        """Create a new league."""
        db_league = League(**league.dict())
        try:
            db.add(db_league)
            db.commit()
            db.refresh(db_league)
            return db_league
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"Error creating league: {str(e)}")
            raise

    async def get_league(self, db: Session, league_id: UUID) -> Optional[League]:
        """Get a specific league by ID."""
        return db.query(League).filter(League.id == league_id).first()

    async def update_league(self, db: Session, league_id: UUID, league_update: LeagueUpdate) -> Optional[League]:
        """Update a specific league."""
        db_league = await self.get_league(db, league_id)
        if not db_league:
            return None

        update_data = league_update.dict(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_league, key, value)

        try:
            db.add(db_league)
            db.commit()
            db.refresh(db_league)
            return db_league
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"Error updating league: {str(e)}")
            raise

    async def delete_league(self, db: Session, league_id: UUID) -> bool:
        """Delete a specific league."""
        db_league = await self.get_league(db, league_id)
        if not db_league:
            return False

        try:
            db.delete(db_league)
            db.commit()
            return True
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"Error deleting league: {str(e)}")
            raise

    # Team methods
    async def get_teams(self, db: Session, league_id: Optional[UUID] = None) -> List[Team]:
        """Get all teams, optionally filtered by league."""
        query = db.query(Team)
        if league_id:
            query = query.filter(Team.league_id == league_id)
        return query.all()

    async def create_team(self, db: Session, team: TeamCreate) -> Team:
        """Create a new team."""
        # Validate that the league and stadium exist
        league = db.query(League).filter(League.id == team.league_id).first()
        if not league:
            raise ValueError(f"League with ID {team.league_id} not found")
        
        stadium = db.query(Stadium).filter(Stadium.id == team.stadium_id).first()
        if not stadium:
            raise ValueError(f"Stadium with ID {team.stadium_id} not found")

        db_team = Team(**team.dict())
        try:
            db.add(db_team)
            db.commit()
            db.refresh(db_team)
            return db_team
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"Error creating team: {str(e)}")
            raise

    async def get_team(self, db: Session, team_id: UUID) -> Optional[Team]:
        """Get a specific team by ID."""
        return db.query(Team).filter(Team.id == team_id).first()

    async def update_team(self, db: Session, team_id: UUID, team_update: TeamUpdate) -> Optional[Team]:
        """Update a specific team."""
        db_team = await self.get_team(db, team_id)
        if not db_team:
            return None

        update_data = team_update.dict(exclude_unset=True)
        
        # Validate foreign keys if they are being updated
        if 'league_id' in update_data:
            league = db.query(League).filter(League.id == update_data['league_id']).first()
            if not league:
                raise ValueError(f"League with ID {update_data['league_id']} not found")
        
        if 'stadium_id' in update_data:
            stadium = db.query(Stadium).filter(Stadium.id == update_data['stadium_id']).first()
            if not stadium:
                raise ValueError(f"Stadium with ID {update_data['stadium_id']} not found")

        for key, value in update_data.items():
            setattr(db_team, key, value)

        try:
            db.add(db_team)
            db.commit()
            db.refresh(db_team)
            return db_team
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"Error updating team: {str(e)}")
            raise

    async def delete_team(self, db: Session, team_id: UUID) -> bool:
        """Delete a specific team."""
        db_team = await self.get_team(db, team_id)
        if not db_team:
            return False

        try:
            db.delete(db_team)
            db.commit()
            return True
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"Error deleting team: {str(e)}")
            raise

    # Similar methods would be implemented for other entity types
    # (Player, Game, Stadium, BroadcastCompany, BroadcastRights, etc.)
    # following the same pattern as above 
    # Player methods
        
    async def get_players(self, db: Session, team_id: Optional[UUID] = None) -> List[Player]:
        """Get all players, optionally filtered by team."""
        query = db.query(Player)
        if team_id:
            query = query.filter(Player.team_id == team_id)
        return query.all()

    async def create_player(self, db: Session, player: PlayerCreate) -> Player:
        """Create a new player."""
        # Validate that the team exists
        team = db.query(Team).filter(Team.id == player.team_id).first()
        if not team:
            raise ValueError(f"Team with ID {player.team_id} not found")
        
        db_player = Player(**player.dict())
        try:
            db.add(db_player)
            db.commit()
            db.refresh(db_player)
            return db_player
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"Error creating player: {str(e)}")
            raise

    async def get_player(self, db: Session, player_id: UUID) -> Optional[Player]:
        """Get a specific player by ID."""
        return db.query(Player).filter(Player.id == player_id).first()

    async def update_player(self, db: Session, player_id: UUID, player_update: PlayerUpdate) -> Optional[Player]:
        """Update a specific player."""
        db_player = await self.get_player(db, player_id)
        if not db_player:
            return None

        update_data = player_update.dict(exclude_unset=True)
        
        # Validate foreign keys if they are being updated
        if 'team_id' in update_data:
            team = db.query(Team).filter(Team.id == update_data['team_id']).first()
            if not team:
                raise ValueError(f"Team with ID {update_data['team_id']} not found")

        for key, value in update_data.items():
            setattr(db_player, key, value)

        try:
            db.add(db_player)
            db.commit()
            db.refresh(db_player)
            return db_player
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"Error updating player: {str(e)}")
            raise

    async def delete_player(self, db: Session, player_id: UUID) -> bool:
        """Delete a specific player."""
        db_player = await self.get_player(db, player_id)
        if not db_player:
            return False

        try:
            db.delete(db_player)
            db.commit()
            return True
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"Error deleting player: {str(e)}")
            raise

    # Game methods
    async def get_games(self, db: Session, league_id: Optional[UUID] = None, 
                    team_id: Optional[UUID] = None, season_year: Optional[int] = None) -> List[Game]:
        """Get all games, optionally filtered by league, team, or season."""
        query = db.query(Game)
        if league_id:
            query = query.filter(Game.league_id == league_id)
        if team_id:
            query = query.filter((Game.home_team_id == team_id) | (Game.away_team_id == team_id))
        if season_year:
            query = query.filter(Game.season_year == season_year)
        return query.all()

    async def create_game(self, db: Session, game: GameCreate) -> Game:
        """Create a new game."""
        # Validate that the league, teams, and stadium exist
        league = db.query(League).filter(League.id == game.league_id).first()
        if not league:
            raise ValueError(f"League with ID {game.league_id} not found")
        
        home_team = db.query(Team).filter(Team.id == game.home_team_id).first()
        if not home_team:
            raise ValueError(f"Home team with ID {game.home_team_id} not found")
        
        away_team = db.query(Team).filter(Team.id == game.away_team_id).first()
        if not away_team:
            raise ValueError(f"Away team with ID {game.away_team_id} not found")
        
        stadium = db.query(Stadium).filter(Stadium.id == game.stadium_id).first()
        if not stadium:
            raise ValueError(f"Stadium with ID {game.stadium_id} not found")

        db_game = Game(**game.dict())
        try:
            db.add(db_game)
            db.commit()
            db.refresh(db_game)
            return db_game
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"Error creating game: {str(e)}")
            raise

    async def get_game(self, db: Session, game_id: UUID) -> Optional[Game]:
        """Get a specific game by ID."""
        return db.query(Game).filter(Game.id == game_id).first()

    async def update_game(self, db: Session, game_id: UUID, game_update: GameUpdate) -> Optional[Game]:
        """Update a specific game."""
        db_game = await self.get_game(db, game_id)
        if not db_game:
            return None

        update_data = game_update.dict(exclude_unset=True)
        
        # Validate foreign keys if they are being updated
        if 'league_id' in update_data:
            league = db.query(League).filter(League.id == update_data['league_id']).first()
            if not league:
                raise ValueError(f"League with ID {update_data['league_id']} not found")
        
        if 'home_team_id' in update_data:
            home_team = db.query(Team).filter(Team.id == update_data['home_team_id']).first()
            if not home_team:
                raise ValueError(f"Home team with ID {update_data['home_team_id']} not found")
        
        if 'away_team_id' in update_data:
            away_team = db.query(Team).filter(Team.id == update_data['away_team_id']).first()
            if not away_team:
                raise ValueError(f"Away team with ID {update_data['away_team_id']} not found")
        
        if 'stadium_id' in update_data:
            stadium = db.query(Stadium).filter(Stadium.id == update_data['stadium_id']).first()
            if not stadium:
                raise ValueError(f"Stadium with ID {update_data['stadium_id']} not found")

        for key, value in update_data.items():
            setattr(db_game, key, value)

        try:
            db.add(db_game)
            db.commit()
            db.refresh(db_game)
            return db_game
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"Error updating game: {str(e)}")
            raise

    async def delete_game(self, db: Session, game_id: UUID) -> bool:
        """Delete a specific game."""
        db_game = await self.get_game(db, game_id)
        if not db_game:
            return False

        try:
            db.delete(db_game)
            db.commit()
            return True
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"Error deleting game: {str(e)}")
            raise

    # Stadium methods
    async def get_stadiums(self, db: Session) -> List[Stadium]:
        """Get all stadiums."""
        return db.query(Stadium).all()

    async def create_stadium(self, db: Session, stadium: StadiumCreate) -> Stadium:
        """Create a new stadium."""
        db_stadium = Stadium(**stadium.dict())
        try:
            db.add(db_stadium)
            db.commit()
            db.refresh(db_stadium)
            return db_stadium
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"Error creating stadium: {str(e)}")
            raise

    async def get_stadium(self, db: Session, stadium_id: UUID) -> Optional[Stadium]:
        """Get a specific stadium by ID."""
        return db.query(Stadium).filter(Stadium.id == stadium_id).first()

    async def update_stadium(self, db: Session, stadium_id: UUID, stadium_update: StadiumUpdate) -> Optional[Stadium]:
        """Update a specific stadium."""
        db_stadium = await self.get_stadium(db, stadium_id)
        if not db_stadium:
            return None

        update_data = stadium_update.dict(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_stadium, key, value)

        try:
            db.add(db_stadium)
            db.commit()
            db.refresh(db_stadium)
            return db_stadium
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"Error updating stadium: {str(e)}")
            raise

    async def delete_stadium(self, db: Session, stadium_id: UUID) -> bool:
        """Delete a specific stadium."""
        db_stadium = await self.get_stadium(db, stadium_id)
        if not db_stadium:
            return False

        try:
            db.delete(db_stadium)
            db.commit()
            return True
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"Error deleting stadium: {str(e)}")
            raise
        
    # BroadcastCompany methods
    async def get_broadcast_companies(self, db: Session) -> List[BroadcastCompany]:
        """Get all broadcast companies."""
        return db.query(BroadcastCompany).all()

    async def create_broadcast_company(self, db: Session, broadcast_company: BroadcastCompanyCreate) -> BroadcastCompany:
        """Create a new broadcast company."""
        db_broadcast_company = BroadcastCompany(**broadcast_company.dict())
        try:
            db.add(db_broadcast_company)
            db.commit()
            db.refresh(db_broadcast_company)
            return db_broadcast_company
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"Error creating broadcast company: {str(e)}")
            raise

    async def get_broadcast_company(self, db: Session, broadcast_company_id: UUID) -> Optional[BroadcastCompany]:
        """Get a specific broadcast company by ID."""
        return db.query(BroadcastCompany).filter(BroadcastCompany.id == broadcast_company_id).first()

    async def update_broadcast_company(self, db: Session, broadcast_company_id: UUID, 
                                    broadcast_company_update: BroadcastCompanyUpdate) -> Optional[BroadcastCompany]:
        """Update a specific broadcast company."""
        db_broadcast_company = await self.get_broadcast_company(db, broadcast_company_id)
        if not db_broadcast_company:
            return None

        update_data = broadcast_company_update.dict(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_broadcast_company, key, value)

        try:
            db.add(db_broadcast_company)
            db.commit()
            db.refresh(db_broadcast_company)
            return db_broadcast_company
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"Error updating broadcast company: {str(e)}")
            raise

    async def delete_broadcast_company(self, db: Session, broadcast_company_id: UUID) -> bool:
        """Delete a specific broadcast company."""
        db_broadcast_company = await self.get_broadcast_company(db, broadcast_company_id)
        if not db_broadcast_company:
            return False

        try:
            db.delete(db_broadcast_company)
            db.commit()
            return True
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"Error deleting broadcast company: {str(e)}")
            raise

    # BroadcastRights methods
    async def get_broadcast_rights(self, db: Session, entity_id: Optional[UUID] = None, 
                                broadcast_company_id: Optional[UUID] = None) -> List[BroadcastRights]:
        """Get all broadcast rights, optionally filtered by entity or broadcast company."""
        query = db.query(BroadcastRights)
        if entity_id:
            query = query.filter(BroadcastRights.entity_id == entity_id)
        if broadcast_company_id:
            query = query.filter(BroadcastRights.broadcast_company_id == broadcast_company_id)
        return query.all()

    async def create_broadcast_rights(self, db: Session, broadcast_rights: BroadcastRightsCreate) -> BroadcastRights:
        """Create new broadcast rights."""
        # Validate that the broadcast company exists
        broadcast_company = db.query(BroadcastCompany).filter(
            BroadcastCompany.id == broadcast_rights.broadcast_company_id
        ).first()
        if not broadcast_company:
            raise ValueError(f"Broadcast company with ID {broadcast_rights.broadcast_company_id} not found")
        
        # Validate entity exists (could be a league, team, or game)
        # This would require more complex validation based on entity_type
        
        db_broadcast_rights = BroadcastRights(**broadcast_rights.dict())
        try:
            db.add(db_broadcast_rights)
            db.commit()
            db.refresh(db_broadcast_rights)
            return db_broadcast_rights
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"Error creating broadcast rights: {str(e)}")
            raise

    async def get_broadcast_right(self, db: Session, broadcast_rights_id: UUID) -> Optional[BroadcastRights]:
        """Get specific broadcast rights by ID."""
        return db.query(BroadcastRights).filter(BroadcastRights.id == broadcast_rights_id).first()

    async def update_broadcast_rights(self, db: Session, broadcast_rights_id: UUID, 
                                    broadcast_rights_update: BroadcastRightsUpdate) -> Optional[BroadcastRights]:
        """Update specific broadcast rights."""
        db_broadcast_rights = await self.get_broadcast_right(db, broadcast_rights_id)
        if not db_broadcast_rights:
            return None

        update_data = broadcast_rights_update.dict(exclude_unset=True)
        
        # Validate foreign keys if they are being updated
        if 'broadcast_company_id' in update_data:
            broadcast_company = db.query(BroadcastCompany).filter(
                BroadcastCompany.id == update_data['broadcast_company_id']
            ).first()
            if not broadcast_company:
                raise ValueError(f"Broadcast company with ID {update_data['broadcast_company_id']} not found")

        for key, value in update_data.items():
            setattr(db_broadcast_rights, key, value)

        try:
            db.add(db_broadcast_rights)
            db.commit()
            db.refresh(db_broadcast_rights)
            return db_broadcast_rights
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"Error updating broadcast rights: {str(e)}")
            raise

    async def delete_broadcast_rights(self, db: Session, broadcast_rights_id: UUID) -> bool:
        """Delete specific broadcast rights."""
        db_broadcast_rights = await self.get_broadcast_right(db, broadcast_rights_id)
        if not db_broadcast_rights:
            return False

        try:
            db.delete(db_broadcast_rights)
            db.commit()
            return True
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"Error deleting broadcast rights: {str(e)}")
            raise

    # ProductionCompany methods
    async def get_production_companies(self, db: Session) -> List[ProductionCompany]:
        """Get all production companies."""
        return db.query(ProductionCompany).all()

    async def create_production_company(self, db: Session, production_company: ProductionCompanyCreate) -> ProductionCompany:
        """Create a new production company."""
        db_production_company = ProductionCompany(**production_company.dict())
        try:
            db.add(db_production_company)
            db.commit()
            db.refresh(db_production_company)
            return db_production_company
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"Error creating production company: {str(e)}")
            raise

    async def get_production_company(self, db: Session, production_company_id: UUID) -> Optional[ProductionCompany]:
        """Get a specific production company by ID."""
        return db.query(ProductionCompany).filter(ProductionCompany.id == production_company_id).first()

    async def update_production_company(self, db: Session, production_company_id: UUID, 
                                    production_company_update: ProductionCompanyUpdate) -> Optional[ProductionCompany]:
        """Update a specific production company."""
        db_production_company = await self.get_production_company(db, production_company_id)
        if not db_production_company:
            return None

        update_data = production_company_update.dict(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_production_company, key, value)

        try:
            db.add(db_production_company)
            db.commit()
            db.refresh(db_production_company)
            return db_production_company
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"Error updating production company: {str(e)}")
            raise

    async def delete_production_company(self, db: Session, production_company_id: UUID) -> bool:
        """Delete a specific production company."""
        db_production_company = await self.get_production_company(db, production_company_id)
        if not db_production_company:
            return False

        try:
            db.delete(db_production_company)
            db.commit()
            return True
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"Error deleting production company: {str(e)}")
            raise

    # ProductionService methods
    async def get_production_services(self, db: Session, entity_id: Optional[UUID] = None, 
                                    production_company_id: Optional[UUID] = None) -> List[ProductionService]:
        """Get all production services, optionally filtered by entity or production company."""
        query = db.query(ProductionService)
        if entity_id:
            query = query.filter(ProductionService.entity_id == entity_id)
        if production_company_id:
            query = query.filter(ProductionService.production_company_id == production_company_id)
        return query.all()

    async def create_production_service(self, db: Session, production_service: ProductionServiceCreate) -> ProductionService:
        """Create a new production service."""
        # Validate that the production company exists
        production_company = db.query(ProductionCompany).filter(
            ProductionCompany.id == production_service.production_company_id
        ).first()
        if not production_company:
            raise ValueError(f"Production company with ID {production_service.production_company_id} not found")
        
        # Validate entity exists (could be a league, team, or game)
        # This would require more complex validation based on entity_type
        
        db_production_service = ProductionService(**production_service.dict())
        try:
            db.add(db_production_service)
            db.commit()
            db.refresh(db_production_service)
            return db_production_service
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"Error creating production service: {str(e)}")
            raise

    async def get_production_service(self, db: Session, production_service_id: UUID) -> Optional[ProductionService]:
        """Get a specific production service by ID."""
        return db.query(ProductionService).filter(ProductionService.id == production_service_id).first()

    async def update_production_service(self, db: Session, production_service_id: UUID, 
                                    production_service_update: ProductionServiceUpdate) -> Optional[ProductionService]:
        """Update a specific production service."""
        db_production_service = await self.get_production_service(db, production_service_id)
        if not db_production_service:
            return None

        update_data = production_service_update.dict(exclude_unset=True)
        
        # Validate foreign keys if they are being updated
        if 'production_company_id' in update_data:
            production_company = db.query(ProductionCompany).filter(
                ProductionCompany.id == update_data['production_company_id']
            ).first()
            if not production_company:
                raise ValueError(f"Production company with ID {update_data['production_company_id']} not found")

        for key, value in update_data.items():
            setattr(db_production_service, key, value)

        try:
            db.add(db_production_service)
            db.commit()
            db.refresh(db_production_service)
            return db_production_service
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"Error updating production service: {str(e)}")
            raise

    async def delete_production_service(self, db: Session, production_service_id: UUID) -> bool:
        """Delete a specific production service."""
        db_production_service = await self.get_production_service(db, production_service_id)
        if not db_production_service:
            return False

        try:
            db.delete(db_production_service)
            db.commit()
            return True
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"Error deleting production service: {str(e)}")
            raise

    # Brand methods
    async def get_brands(self, db: Session) -> List[Brand]:
        """Get all brands."""
        return db.query(Brand).all()

    async def create_brand(self, db: Session, brand: BrandCreate) -> Brand:
        """Create a new brand."""
        db_brand = Brand(**brand.dict())
        try:
            db.add(db_brand)
            db.commit()
            db.refresh(db_brand)
            return db_brand
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"Error creating brand: {str(e)}")
            raise

    async def get_brand(self, db: Session, brand_id: UUID) -> Optional[Brand]:
        """Get a specific brand by ID."""
        return db.query(Brand).filter(Brand.id == brand_id).first()

    async def update_brand(self, db: Session, brand_id: UUID, brand_update: BrandUpdate) -> Optional[Brand]:
        """Update a specific brand."""
        db_brand = await self.get_brand(db, brand_id)
        if not db_brand:
            return None

        update_data = brand_update.dict(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_brand, key, value)

        try:
            db.add(db_brand)
            db.commit()
            db.refresh(db_brand)
            return db_brand
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"Error updating brand: {str(e)}")
            raise

    async def delete_brand(self, db: Session, brand_id: UUID) -> bool:
        """Delete a specific brand."""
        db_brand = await self.get_brand(db, brand_id)
        if not db_brand:
            return False

        try:
            db.delete(db_brand)
            db.commit()
            return True
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"Error deleting brand: {str(e)}")
            raise

    # BrandRelationship methods
    async def get_brand_relationships(self, db: Session, entity_id: Optional[UUID] = None, 
                                    brand_id: Optional[UUID] = None) -> List[BrandRelationship]:
        """Get all brand relationships, optionally filtered by entity or brand."""
        query = db.query(BrandRelationship)
        if entity_id:
            query = query.filter(BrandRelationship.entity_id == entity_id)
        if brand_id:
            query = query.filter(BrandRelationship.brand_id == brand_id)
        return query.all()

    async def create_brand_relationship(self, db: Session, brand_relationship: BrandRelationshipCreate) -> BrandRelationship:
        """Create a new brand relationship."""
        # Validate that the brand exists
        brand = db.query(Brand).filter(Brand.id == brand_relationship.brand_id).first()
        if not brand:
            raise ValueError(f"Brand with ID {brand_relationship.brand_id} not found")
        
        # Validate entity exists (could be a league, team, player, etc.)
        # This would require more complex validation based on entity_type
        
        db_brand_relationship = BrandRelationship(**brand_relationship.dict())
        try:
            db.add(db_brand_relationship)
            db.commit()
            db.refresh(db_brand_relationship)
            return db_brand_relationship
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"Error creating brand relationship: {str(e)}")
            raise

    async def get_brand_relationship(self, db: Session, brand_relationship_id: UUID) -> Optional[BrandRelationship]:
        """Get a specific brand relationship by ID."""
        return db.query(BrandRelationship).filter(BrandRelationship.id == brand_relationship_id).first()

    async def update_brand_relationship(self, db: Session, brand_relationship_id: UUID, 
                                    brand_relationship_update: BrandRelationshipUpdate) -> Optional[BrandRelationship]:
        """Update a specific brand relationship."""
        db_brand_relationship = await self.get_brand_relationship(db, brand_relationship_id)
        if not db_brand_relationship:
            return None

        update_data = brand_relationship_update.dict(exclude_unset=True)
        
        # Validate foreign keys if they are being updated
        if 'brand_id' in update_data:
            brand = db.query(Brand).filter(Brand.id == update_data['brand_id']).first()
            if not brand:
                raise ValueError(f"Brand with ID {update_data['brand_id']} not found")

        for key, value in update_data.items():
            setattr(db_brand_relationship, key, value)

        try:
            db.add(db_brand_relationship)
            db.commit()
            db.refresh(db_brand_relationship)
            return db_brand_relationship
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"Error updating brand relationship: {str(e)}")
            raise

    async def delete_brand_relationship(self, db: Session, brand_relationship_id: UUID) -> bool:
        """Delete a specific brand relationship."""
        db_brand_relationship = await self.get_brand_relationship(db, brand_relationship_id)
        if not db_brand_relationship:
            return False

        try:
            db.delete(db_brand_relationship)
            db.commit()
            return True
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"Error deleting brand relationship: {str(e)}")
            raise