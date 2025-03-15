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
    TeamRecord, TeamOwnership,
    DivisionConference
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
        "divisions_conferences": DivisionConference,
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
        "division_conference": DivisionConference,
        # Additional mappings for frontend entity types
        "broadcast": BroadcastRights,
        "production": ProductionService
    }

    async def get_entities(self, db: AsyncSession, entity_type: str, page: int = 1, limit: int = 50, sort_by: str = "id", sort_direction: str = "asc") -> Dict[str, Any]:
        """Get paginated entities of a specific type."""
        if entity_type not in self.ENTITY_TYPES:
            raise ValueError(f"Invalid entity type: {entity_type}")
        
        model_class = self.ENTITY_TYPES[entity_type]
        
        # Get total count
        count_query = select(func.count()).select_from(model_class)
        total_count = await db.scalar(count_query)
        
        # Special handling for division_conference entities to include league_name
        if entity_type == "division_conference":
            # Join with League to get the league name
            query = (
                select(model_class, League.name.label("league_name"))
                .join(League, model_class.league_id == League.id)
            )
            
            # Add sorting - handle special case for league_name
            if sort_by == "league_name":
                # Sort by the league name from the joined League table
                if sort_direction.lower() == "desc":
                    query = query.order_by(League.name.desc())
                else:
                    query = query.order_by(League.name.asc())
            elif hasattr(model_class, sort_by):
                sort_column = getattr(model_class, sort_by)
                if sort_direction.lower() == "desc":
                    query = query.order_by(sort_column.desc())
                else:
                    query = query.order_by(sort_column.asc())
            
            # Add pagination
            query = query.offset((page - 1) * limit).limit(limit)
            
            result = await db.execute(query)
            rows = result.all()
            
            # Process the results to include league_name
            entities_with_league = []
            for row in rows:
                division_conference = row[0]  # The DivisionConference model
                league_name = row[1]          # The league_name from the query
                
                # Convert the model to a dict and add league_name
                entity_dict = self._model_to_dict(division_conference)
                entity_dict["league_name"] = league_name
                
                entities_with_league.append(entity_dict)
            
            return {
                "items": entities_with_league,
                "total": total_count,
                "page": page,
                "size": limit,
                "pages": math.ceil(total_count / limit)
            }
        else:
            # Standard handling for other entity types
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
                "size": limit,
                "pages": math.ceil(total_count / limit)
            }

    def _model_to_dict(self, model: Any) -> Dict[str, Any]:
        """Convert a model instance to a dictionary."""
        result = {}
        for column in model.__table__.columns:
            result[column.name] = getattr(model, column.name)
        return result
        
    async def get_entities_with_related_names(self, db: AsyncSession, entity_type: str, page: int = 1, limit: int = 50, sort_by: str = "id", sort_direction: str = "asc") -> Dict[str, Any]:
        """Get entities with related entity names for better display in the UI.
        
        This method provides a standard approach to fetching entities with their
        related names for all entity types. It will only add related name fields
        to the response, without modifying the original fields.
        """
        if entity_type not in self.ENTITY_TYPES:
            raise ValueError(f"Invalid entity type: {entity_type}")
        
        model_class = self.ENTITY_TYPES[entity_type]
        
        # Get total count for pagination
        count_query = select(func.count()).select_from(model_class)
        total_count = await db.scalar(count_query)
        
        # Create base query for the entity
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
        
        # Execute query
        result = await db.execute(query)
        entities = result.scalars().all()
        
        # Process results to include related entity names
        processed_items = []
        for entity in entities:
            # Convert entity to dictionary
            item_dict = self._model_to_dict(entity)
            
            # Add related entity names based on entity type
            try:
                # Handle teams (has league_id, division_conference_id, stadium_id)
                if entity_type in ['team', 'teams']:
                    if hasattr(entity, 'league_id'):
                        league_result = await db.execute(select(League.name).where(League.id == entity.league_id))
                        item_dict["league_name"] = league_result.scalar()
                    
                    if hasattr(entity, 'division_conference_id'):
                        div_conf_result = await db.execute(select(DivisionConference.name).where(DivisionConference.id == entity.division_conference_id))
                        item_dict["division_conference_name"] = div_conf_result.scalar()
                    
                    if hasattr(entity, 'stadium_id'):
                        stadium_result = await db.execute(select(Stadium.name).where(Stadium.id == entity.stadium_id))
                        item_dict["stadium_name"] = stadium_result.scalar()
                
                # Handle players (has team_id)
                elif entity_type in ['player', 'players']:
                    if hasattr(entity, 'team_id'):
                        team_result = await db.execute(select(Team.name).where(Team.id == entity.team_id))
                        item_dict["team_name"] = team_result.scalar()
                
                # Handle games (has league_id, home_team_id, away_team_id, stadium_id)
                elif entity_type in ['game', 'games']:
                    if hasattr(entity, 'league_id'):
                        league_result = await db.execute(select(League.name).where(League.id == entity.league_id))
                        item_dict["league_name"] = league_result.scalar()
                    
                    if hasattr(entity, 'home_team_id'):
                        home_team_result = await db.execute(select(Team.name).where(Team.id == entity.home_team_id))
                        item_dict["home_team_name"] = home_team_result.scalar()
                    
                    if hasattr(entity, 'away_team_id'):
                        away_team_result = await db.execute(select(Team.name).where(Team.id == entity.away_team_id))
                        item_dict["away_team_name"] = away_team_result.scalar()
                    
                    if hasattr(entity, 'stadium_id'):
                        stadium_result = await db.execute(select(Stadium.name).where(Stadium.id == entity.stadium_id))
                        item_dict["stadium_name"] = stadium_result.scalar()
                
                # Handle division/conference (has league_id)
                elif entity_type in ['division_conference', 'divisions_conferences']:
                    if hasattr(entity, 'league_id'):
                        league_result = await db.execute(select(League.name).where(League.id == entity.league_id))
                        item_dict["league_name"] = league_result.scalar()
                
                # Handle broadcast rights (has broadcast_company_id, entity_id, division_conference_id)
                elif entity_type in ['broadcast', 'broadcast_right', 'broadcast_rights']:
                    if hasattr(entity, 'broadcast_company_id'):
                        company_result = await db.execute(select(BroadcastCompany.name).where(BroadcastCompany.id == entity.broadcast_company_id))
                        item_dict["broadcast_company_name"] = company_result.scalar()
                    
                    if hasattr(entity, 'division_conference_id') and entity.division_conference_id:
                        div_conf_result = await db.execute(select(DivisionConference.name).where(DivisionConference.id == entity.division_conference_id))
                        item_dict["division_conference_name"] = div_conf_result.scalar()
                    
                    # Handle entity_id based on entity_type
                    if hasattr(entity, 'entity_type') and hasattr(entity, 'entity_id'):
                        if entity.entity_type == "league":
                            entity_result = await db.execute(select(League.name).where(League.id == entity.entity_id))
                            item_dict["entity_name"] = entity_result.scalar()
                        elif entity.entity_type == "team":
                            entity_result = await db.execute(select(Team.name).where(Team.id == entity.entity_id))
                            item_dict["entity_name"] = entity_result.scalar()
                        elif entity.entity_type == "division_conference":
                            entity_result = await db.execute(select(DivisionConference.name).where(DivisionConference.id == entity.entity_id))
                            item_dict["entity_name"] = entity_result.scalar()
                        elif entity.entity_type == "game":
                            entity_result = await db.execute(select(Game).where(Game.id == entity.entity_id))
                            game = entity_result.scalar()
                            if game:
                                # For games, we need to get more context
                                home_team_result = await db.execute(select(Team.name).where(Team.id == game.home_team_id))
                                home_team_name = home_team_result.scalar()
                                away_team_result = await db.execute(select(Team.name).where(Team.id == game.away_team_id))
                                away_team_name = away_team_result.scalar()
                                item_dict["entity_name"] = f"{home_team_name} vs {away_team_name}"
                        
                    # Generate a name for broadcast rights since it doesn't have a name field in the database
                    # First try to get entity_name (which we just set above)
                    entity_name = item_dict.get("entity_name")
                    company_name = item_dict.get("broadcast_company_name")
                    
                    if entity_name and company_name:
                        item_dict["name"] = f"{company_name} - {entity_name}"
                    elif company_name:
                        # If we don't have entity_name but have company name
                        territory = getattr(entity, 'territory', 'Unknown Territory')
                        item_dict["name"] = f"{company_name} - {territory}"
                    else:
                        # Fallback
                        item_dict["name"] = f"Broadcast Rights {entity.id}"
                
                # Handle production services (has production_company_id, entity_id)
                elif entity_type in ['production', 'production_service', 'production_services']:
                    if hasattr(entity, 'production_company_id'):
                        company_result = await db.execute(select(ProductionCompany.name).where(ProductionCompany.id == entity.production_company_id))
                        item_dict["production_company_name"] = company_result.scalar()
                    
                    # Handle entity_id based on entity_type - similar to broadcast rights
                    if hasattr(entity, 'entity_type') and hasattr(entity, 'entity_id'):
                        # Similar entity lookup as broadcast rights
                        if entity.entity_type == "league":
                            entity_result = await db.execute(select(League.name).where(League.id == entity.entity_id))
                            item_dict["entity_name"] = entity_result.scalar()
                        elif entity.entity_type == "team":
                            entity_result = await db.execute(select(Team.name).where(Team.id == entity.entity_id))
                            item_dict["entity_name"] = entity_result.scalar()
                        elif entity.entity_type == "division_conference":
                            entity_result = await db.execute(select(DivisionConference.name).where(DivisionConference.id == entity.entity_id))
                            item_dict["entity_name"] = entity_result.scalar()
                        elif entity.entity_type == "game":
                            entity_result = await db.execute(select(Game).where(Game.id == entity.entity_id))
                            game = entity_result.scalar()
                            if game:
                                home_team_result = await db.execute(select(Team.name).where(Team.id == game.home_team_id))
                                home_team_name = home_team_result.scalar()
                                away_team_result = await db.execute(select(Team.name).where(Team.id == game.away_team_id))
                                away_team_name = away_team_result.scalar()
                                item_dict["entity_name"] = f"{home_team_name} vs {away_team_name}"
                                
                    # Generate a name for production services since it doesn't have a name field in the database
                    entity_name = item_dict.get("entity_name")
                    company_name = item_dict.get("production_company_name")
                    
                    if entity_name and company_name:
                        item_dict["name"] = f"{company_name} - {entity_name}"
                    elif company_name:
                        service_type = getattr(entity, 'service_type', 'Service')
                        item_dict["name"] = f"{company_name} - {service_type}"
                    else:
                        # Fallback
                        item_dict["name"] = f"Production Service {entity.id}"
                
                # Handle game broadcasts (has game_id, broadcast_company_id, production_company_id)
                elif entity_type in ['game_broadcast', 'game_broadcasts']:
                    if hasattr(entity, 'game_id'):
                        # For games, we need to get more context
                        game_result = await db.execute(
                            select(Game, Team.name.label("home_team_name"))
                            .join(Team, Game.home_team_id == Team.id)
                            .where(Game.id == entity.game_id)
                        )
                        game_record = game_result.first()
                        if game_record:
                            game = game_record[0]
                            home_team_name = game_record[1]
                            away_team_result = await db.execute(select(Team.name).where(Team.id == game.away_team_id))
                            away_team_name = away_team_result.scalar()
                            item_dict["game_name"] = f"{home_team_name} vs {away_team_name}"
                    
                    if hasattr(entity, 'broadcast_company_id'):
                        company_result = await db.execute(select(BroadcastCompany.name).where(BroadcastCompany.id == entity.broadcast_company_id))
                        item_dict["broadcast_company_name"] = company_result.scalar()
                    
                    if hasattr(entity, 'production_company_id') and entity.production_company_id:
                        company_result = await db.execute(select(ProductionCompany.name).where(ProductionCompany.id == entity.production_company_id))
                        item_dict["production_company_name"] = company_result.scalar()
                        
                    # Generate a name for game broadcasts since they don't have a name field in the database
                    game_name = item_dict.get("game_name")
                    broadcast_company = item_dict.get("broadcast_company_name")
                    
                    if game_name and broadcast_company:
                        item_dict["name"] = f"{broadcast_company} - {game_name}"
                    elif broadcast_company:
                        broadcast_type = getattr(entity, 'broadcast_type', 'Broadcast')
                        item_dict["name"] = f"{broadcast_company} - {broadcast_type}"
                    else:
                        # Fallback
                        item_dict["name"] = f"Game Broadcast {entity.id}"
                
                # Handle league executives (has league_id)
                elif entity_type in ['league_executive', 'league_executives']:
                    if hasattr(entity, 'league_id'):
                        league_result = await db.execute(select(League.name).where(League.id == entity.league_id))
                        item_dict["league_name"] = league_result.scalar()
                        
                    # Since league executives have a name field already, make sure it's used
                    # But we can still enhance it by adding league information
                    if hasattr(entity, 'name') and item_dict.get("league_name"):
                        league_name = item_dict.get("league_name")
                        position = getattr(entity, 'position', 'Executive')
                        item_dict["name"] = f"{entity.name} - {position} ({league_name})"
                
                # Handle brand relationships (has brand_id, entity_id)
                elif entity_type in ['brand_relationship', 'brand_relationships']:
                    if hasattr(entity, 'brand_id'):
                        brand_result = await db.execute(select(Brand.name).where(Brand.id == entity.brand_id))
                        item_dict["brand_name"] = brand_result.scalar()
                    
                    # Handle entity_id based on entity_type - similar to broadcast rights
                    if hasattr(entity, 'entity_type') and hasattr(entity, 'entity_id'):
                        # Similar entity lookup as broadcast rights
                        if entity.entity_type == "league":
                            entity_result = await db.execute(select(League.name).where(League.id == entity.entity_id))
                            item_dict["entity_name"] = entity_result.scalar()
                        elif entity.entity_type == "team":
                            entity_result = await db.execute(select(Team.name).where(Team.id == entity.entity_id))
                            item_dict["entity_name"] = entity_result.scalar()
                        elif entity.entity_type == "player":
                            entity_result = await db.execute(select(Player.name).where(Player.id == entity.entity_id))
                            item_dict["entity_name"] = entity_result.scalar()
                        elif entity.entity_type == "stadium":
                            entity_result = await db.execute(select(Stadium.name).where(Stadium.id == entity.entity_id))
                            item_dict["entity_name"] = entity_result.scalar()
                    
                    # Generate a name for brand relationships
                    brand_name = item_dict.get("brand_name")
                    entity_name = item_dict.get("entity_name")
                    
                    if brand_name and entity_name:
                        relationship_type = getattr(entity, 'relationship_type', 'Relationship')
                        item_dict["name"] = f"{brand_name} - {entity_name} {relationship_type}"
                    elif brand_name:
                        item_dict["name"] = f"{brand_name} Brand Relationship"
                    else:
                        # Fallback
                        item_dict["name"] = f"Brand Relationship {entity.id}"
            except Exception as e:
                # If we fail to get related names, log error and continue
                # This ensures the API will still return results even if related data lookup fails
                logger.error(f"Error fetching related names for {entity_type} with ID {entity.id}: {str(e)}")
            
            processed_items.append(item_dict)
        
        return {
            "items": processed_items,
            "total": total_count,
            "page": page,
            "size": limit,
            "pages": math.ceil(total_count / limit)
        }

    # League methods
    async def get_leagues(self, db: AsyncSession) -> List[League]:
        """Get all leagues."""
        result = await db.execute(select(League))
        return result.scalars().all()

    async def create_league(self, db: AsyncSession, league: LeagueCreate) -> League:
        """Create a new league or update if it already exists."""
        # Check if a league with the same name already exists
        existing_league = await db.execute(
            select(League).where(League.name == league.name)
        )
        db_league = existing_league.scalars().first()

        if db_league:
            # Update existing league
            for key, value in league.dict().items():
                if value is not None:  # Only update non-None values
                    setattr(db_league, key, value)
        else:
            # Create new league
            db_league = League(**league.dict())
            db.add(db_league)
        
        try:
            await db.commit()
            await db.refresh(db_league)
            return db_league
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Error creating/updating league: {str(e)}")
            raise

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
        """Create a new team or update if it already exists."""
        # First check if the league exists
        result = await db.execute(select(League).where(League.id == team.league_id))
        league = result.scalars().first()
        if not league:
            raise ValueError(f"League with ID {team.league_id} not found")
        
        # Validate that division_conference exists and belongs to the specified league
        result = await db.execute(select(DivisionConference).where(
            DivisionConference.id == team.division_conference_id
        ))
        division_conference = result.scalars().first()
        if not division_conference:
            raise ValueError(f"Division/Conference with ID {team.division_conference_id} not found")
        
        if division_conference.league_id != team.league_id:
            raise ValueError(f"Division/Conference with ID {team.division_conference_id} does not belong to League with ID {team.league_id}")
            
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
        
        # Validate division_conference_id if it's being updated
        if 'division_conference_id' in update_data:
            div_conf_result = await db.execute(select(DivisionConference).where(DivisionConference.id == update_data['division_conference_id']))
            div_conf = div_conf_result.scalars().first()
            if not div_conf:
                raise ValueError(f"Division/Conference with ID {update_data['division_conference_id']} not found")
            
            # Make sure the division/conference belongs to the team's league
            team_league_id = update_data.get('league_id', db_team.league_id)
            if div_conf.league_id != team_league_id:
                raise ValueError(f"Division/Conference with ID {update_data['division_conference_id']} does not belong to League with ID {team_league_id}")
        
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
        """Create a new player or update if one with the same name already exists."""
        # First check if the team exists
        result = await db.execute(select(Team).where(Team.id == player.team_id))
        team = result.scalars().first()
        if not team:
            raise ValueError(f"Team with ID {player.team_id} not found")
        
        # Check if a player with the same name already exists
        existing_player = await db.execute(
            select(Player).where(Player.name == player.name)
        )
        db_player = existing_player.scalars().first()

        if db_player:
            # Update existing player
            for key, value in player.dict().items():
                if value is not None:  # Only update non-None values
                    setattr(db_player, key, value)
        else:
            # Create new player
            db_player = Player(**player.dict())
            db.add(db_player)
        
        try:
            await db.commit()
            await db.refresh(db_player)
            return db_player
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Error creating/updating player: {str(e)}")
            raise

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
        """Create a new stadium or update if it already exists."""
        # Check if a stadium with the same name already exists
        existing_stadium = await db.execute(
            select(Stadium).where(Stadium.name == stadium.name)
        )
        db_stadium = existing_stadium.scalars().first()

        if db_stadium:
            # Update existing stadium
            for key, value in stadium.dict().items():
                if value is not None:  # Only update non-None values
                    setattr(db_stadium, key, value)
        else:
            # Create new stadium
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
            db.add(db_stadium)
        
        try:
            await db.commit()
            await db.refresh(db_stadium)
            return db_stadium
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Error creating/updating stadium: {str(e)}")
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
    async def get_broadcast_rights(self, db: AsyncSession, entity_type: Optional[str] = None,
                                entity_id: Optional[UUID] = None, 
                                company_id: Optional[UUID] = None) -> List[BroadcastRights]:
        """Get all broadcast rights, optionally filtered by entity type, entity ID, or broadcast company."""
        query = (
            select(BroadcastRights)
            .outerjoin(DivisionConference, BroadcastRights.division_conference_id == DivisionConference.id)
        )
        
        # Apply filters
        if entity_type:
            query = query.where(BroadcastRights.entity_type == entity_type)
        if entity_id:
            query = query.where(BroadcastRights.entity_id == entity_id)
        if company_id:
            query = query.where(BroadcastRights.broadcast_company_id == company_id)
            
        result = await db.execute(query)
        broadcast_rights = result.scalars().all()
        
        # Process division_conference relationships
        for br in broadcast_rights:
            if br.division_conference_id and br.entity_type == 'division_conference':
                # Fetch the division_conference to ensure the relationship is loaded
                division_conf_query = select(DivisionConference).where(
                    DivisionConference.id == br.division_conference_id
                )
                division_conf_result = await db.execute(division_conf_query)
                division_conf = division_conf_result.scalars().first()
                
                # Set the entity_id to match the league_id for consistency
                if division_conf and division_conf.league_id:
                    if br.entity_id != division_conf.league_id:
                        br.entity_id = division_conf.league_id
        
        return broadcast_rights

    async def create_broadcast_rights(self, db: AsyncSession, broadcast_rights: BroadcastRightsCreate) -> BroadcastRights:
        """Create new broadcast rights."""
        # Validate that the broadcast company exists
        broadcast_company_result = await db.execute(select(BroadcastCompany).where(
            BroadcastCompany.id == broadcast_rights.broadcast_company_id
        ))
        broadcast_company = broadcast_company_result.scalars().first()
        if not broadcast_company:
            raise ValueError(f"Broadcast company with ID {broadcast_rights.broadcast_company_id} not found")
        
        # Validate division_conference_id if provided
        if broadcast_rights.division_conference_id:
            division_conference_result = await db.execute(select(DivisionConference).where(
                DivisionConference.id == broadcast_rights.division_conference_id
            ))
            division_conference = division_conference_result.scalars().first()
            if not division_conference:
                raise ValueError(f"Division/Conference with ID {broadcast_rights.division_conference_id} not found")
        
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
        # Use a join to also get division_conference information if present
        query = (
            select(BroadcastRights)
            .outerjoin(DivisionConference, BroadcastRights.division_conference_id == DivisionConference.id)
            .where(BroadcastRights.id == broadcast_rights_id)
        )
        result = await db.execute(query)
        broadcast_right = result.scalars().first()
        
        # If there's a division_conference relationship, also fetch its details
        if broadcast_right and broadcast_right.division_conference_id:
            # Fetch the division_conference to ensure the relationship is loaded
            division_conf_query = select(DivisionConference).where(
                DivisionConference.id == broadcast_right.division_conference_id
            )
            division_conf_result = await db.execute(division_conf_query)
            division_conf = division_conf_result.scalars().first()
            
            # Find the corresponding league
            if division_conf and division_conf.league_id and broadcast_right.entity_type == 'division_conference':
                # If entity_id doesn't match league_id, update it
                if broadcast_right.entity_id != division_conf.league_id:
                    broadcast_right.entity_id = division_conf.league_id
        
        return broadcast_right

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
        
        # Validate division_conference_id if it's being updated
        if 'division_conference_id' in update_data and update_data['division_conference_id'] is not None:
            division_conference_result = await db.execute(select(DivisionConference).where(
                DivisionConference.id == update_data['division_conference_id']
            ))
            division_conference = division_conference_result.scalars().first()
            if not division_conference:
                raise ValueError(f"Division/Conference with ID {update_data['division_conference_id']} not found")
        
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

    async def get_entity_by_name(self, db: AsyncSession, entity_type: str, name: str) -> Optional[dict]:
        """Get an entity by name."""
        if entity_type not in self.ENTITY_TYPES:
            raise ValueError(f"Invalid entity type: {entity_type}")
        
        model_class = self.ENTITY_TYPES[entity_type]
        
        # Use case-insensitive search
        query = select(model_class).where(func.lower(model_class.name) == func.lower(name))
        result = await db.execute(query)
        entity = result.scalars().first()
        
        if entity:
            # Convert to dict
            entity_dict = self._model_to_dict(entity)
            
            # For division_conference, also include the league name
            if entity_type == 'division_conference' and hasattr(entity, 'league_id'):
                league_query = select(League).where(League.id == entity.league_id)
                league_result = await db.execute(league_query)
                league = league_result.scalars().first()
                if league:
                    entity_dict['league_name'] = league.name
            
            return entity_dict
        
        return None
    
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