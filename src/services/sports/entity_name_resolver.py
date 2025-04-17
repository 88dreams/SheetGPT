from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Dict, Any, Optional
from uuid import UUID
import logging

from src.models.sports_models import (
    League, Team, Player, Game, Stadium, 
    BroadcastRights, ProductionService,
    Brand, GameBroadcast, LeagueExecutive,
    DivisionConference
)
from src.services.sports.utils import get_model_for_entity_type, get_game_display_name

logger = logging.getLogger(__name__)

class EntityNameResolver:
    """Resolves related entity names for better display."""
    
    @staticmethod
    async def add_related_names(db: AsyncSession, entity_type: str, entity: Dict[str, Any]) -> Dict[str, Any]:
        """Add related entity names to an entity dictionary."""
        item_dict = entity.copy()
        
        try:
            # Handle teams (has league_id, division_conference_id, stadium_id)
            if entity_type in ['team', 'teams']:
                if 'league_id' in entity and entity['league_id']:
                    league_result = await db.execute(select(League.name, League.sport).where(League.id == entity['league_id']))
                    league_data = league_result.first()
                    if league_data:
                        item_dict["league_name"] = league_data[0]
                        item_dict["league_sport"] = league_data[1]
                
                if 'division_conference_id' in entity and entity['division_conference_id']:
                    div_conf_result = await db.execute(select(DivisionConference.name).where(
                        DivisionConference.id == entity['division_conference_id']
                    ))
                    item_dict["division_conference_name"] = div_conf_result.scalar()
                
                if 'stadium_id' in entity and entity['stadium_id']:
                    stadium_result = await db.execute(select(Stadium.name).where(Stadium.id == entity['stadium_id']))
                    item_dict["stadium_name"] = stadium_result.scalar()
            
            # Handle players (has team_id)
            elif entity_type in ['player', 'players']:
                if 'team_id' in entity and entity['team_id']:
                    team_result = await db.execute(select(Team.name).where(Team.id == entity['team_id']))
                    item_dict["team_name"] = team_result.scalar()
            
            # Handle games (has league_id, home_team_id, away_team_id, stadium_id)
            elif entity_type in ['game', 'games']:
                if 'league_id' in entity and entity['league_id']:
                    league_result = await db.execute(select(League.name).where(League.id == entity['league_id']))
                    item_dict["league_name"] = league_result.scalar()
                
                if 'home_team_id' in entity and entity['home_team_id']:
                    home_team_result = await db.execute(select(Team.name).where(Team.id == entity['home_team_id']))
                    item_dict["home_team_name"] = home_team_result.scalar()
                
                if 'away_team_id' in entity and entity['away_team_id']:
                    away_team_result = await db.execute(select(Team.name).where(Team.id == entity['away_team_id']))
                    item_dict["away_team_name"] = away_team_result.scalar()
                
                if 'stadium_id' in entity and entity['stadium_id']:
                    stadium_result = await db.execute(select(Stadium.name).where(Stadium.id == entity['stadium_id']))
                    item_dict["stadium_name"] = stadium_result.scalar()
            
            # Handle division/conference (has league_id)
            elif entity_type in ['division_conference', 'divisions_conferences']:
                if 'league_id' in entity and entity['league_id']:
                    league_result = await db.execute(select(League.name, League.sport).where(League.id == entity['league_id']))
                    league_data = league_result.first()
                    if league_data:
                        item_dict["league_name"] = league_data[0]
                        item_dict["league_sport"] = league_data[1]
            
            # Handle broadcast rights (has broadcast_company_id, entity_id, division_conference_id)
            elif entity_type in ['broadcast', 'broadcast_right', 'broadcast_rights']:
                if 'broadcast_company_id' in entity and entity['broadcast_company_id']:
                    company_result = await db.execute(select(BroadcastCompany.name).where(
                        BroadcastCompany.id == entity['broadcast_company_id']
                    ))
                    item_dict["broadcast_company_name"] = company_result.scalar()
                
                # Start with no league association
                item_dict["league_id"] = None
                item_dict["league_name"] = "Not Associated"
                item_dict["league_sport"] = None
                
                # Get league info based on entity type and relationships
                if 'entity_type' in entity and 'entity_id' in entity and entity['entity_id']:
                    # If the broadcast right is directly for a league
                    if entity['entity_type'].lower() == "league":
                        league_result = await db.execute(select(League).where(League.id == entity['entity_id']))
                        league = league_result.scalars().first()
                        if league:
                            item_dict["entity_name"] = league.name
                            # This is a league directly, so set the league fields
                            item_dict["league_id"] = league.id
                            item_dict["league_name"] = league.name
                            item_dict["league_sport"] = league.sport
                    
                    # If the broadcast right is for a team, get the team's league
                    elif entity['entity_type'].lower() == "team":
                        team_result = await db.execute(
                            select(Team.name, Team.league_id).where(Team.id == entity['entity_id'])
                        )
                        team_data = team_result.first()
                        if team_data:
                            item_dict["entity_name"] = team_data[0]  # Team name
                            if team_data[1]:  # If team has a league_id
                                # Get the league name and sport
                                league_result = await db.execute(
                                    select(League.name, League.sport).where(League.id == team_data[1])
                                )
                                league_data = league_result.first()
                                if league_data:
                                    item_dict["league_id"] = team_data[1]
                                    item_dict["league_name"] = league_data[0]
                                    item_dict["league_sport"] = league_data[1]
                    
                    # If the broadcast right is for a division/conference
                    elif entity['entity_type'].lower() in ["division", "conference", "division_conference"]:
                        div_conf_result = await db.execute(
                            select(DivisionConference.name, DivisionConference.league_id)
                            .where(DivisionConference.id == entity['entity_id'])
                        )
                        div_conf_data = div_conf_result.first()
                        if div_conf_data:
                            item_dict["entity_name"] = div_conf_data[0]  # Division/conference name
                            if div_conf_data[1]:  # If division has a league_id
                                # Get the league name and sport
                                league_result = await db.execute(
                                    select(League.name, League.sport).where(League.id == div_conf_data[1])
                                )
                                league_data = league_result.first()
                                if league_data:
                                    item_dict["league_id"] = div_conf_data[1]
                                    item_dict["league_name"] = league_data[0]
                                    item_dict["league_sport"] = league_data[1]
                    
                    # If the broadcast right is for a game
                    elif entity['entity_type'].lower() == "game":
                        # First get the game name
                        item_dict["entity_name"] = await get_game_display_name(db, entity['entity_id'])
                        
                        # Then try to get the game's league
                        game_result = await db.execute(
                            select(Game.league_id).where(Game.id == entity['entity_id'])
                        )
                        game_league_id = game_result.scalar()
                        if game_league_id:
                            # Get the league name and sport
                            league_result = await db.execute(
                                select(League.name, League.sport).where(League.id == game_league_id)
                            )
                            league_data = league_result.first()
                            if league_data:
                                item_dict["league_id"] = game_league_id
                                item_dict["league_name"] = league_data[0]
                                item_dict["league_sport"] = league_data[1]
                
                # If we have a division_conference_id but no league yet, get league from that
                if 'division_conference_id' in entity and entity['division_conference_id'] and not item_dict["league_id"]:
                    div_conf_query = select(DivisionConference.name, DivisionConference.league_id).where(
                        DivisionConference.id == entity['division_conference_id']
                    )
                    div_conf_result = await db.execute(div_conf_query)
                    div_conf_row = div_conf_result.first()
                    
                    if div_conf_row:
                        item_dict["division_conference_name"] = div_conf_row[0]
                        
                        # Add league info if we have the league_id
                        if div_conf_row[1]:
                            # Store the league_id from the division/conference
                            item_dict["league_id"] = div_conf_row[1]
                            
                            # Get league name and sport
                            league_result = await db.execute(select(League.name, League.sport).where(
                                League.id == div_conf_row[1]
                            ))
                            league_data = league_result.first()
                            if league_data:
                                item_dict["league_name"] = league_data[0]
                                item_dict["league_sport"] = league_data[1]
                    
                # Generate a name for broadcast rights
                entity_name = item_dict.get("entity_name")
                company_name = item_dict.get("broadcast_company_name")
                
                if entity_name and company_name:
                    item_dict["name"] = f"{company_name} - {entity_name}"
                elif company_name:
                    territory = entity.get('territory', 'Unknown Territory')
                    item_dict["name"] = f"{company_name} - {territory}"
                else:
                    # Fallback
                    item_dict["name"] = f"Broadcast Rights {entity['id']}"
            
            # Handle production services (has production_company_id, entity_id)
            elif entity_type in ['production', 'production_service', 'production_services']:
                if 'production_company_id' in entity and entity['production_company_id']:
                    # First try using the Brand model as production_company_id now points to brands
                    company_result = await db.execute(select(Brand.name).where(
                        Brand.id == entity['production_company_id']
                    ))
                    production_company = company_result.scalar()
                    
                    if production_company:
                        # Remove any "(Brand)" suffix
                        item_dict["production_company_name"] = production_company.replace(" (Brand)", "")
                    else:
                        # Fallback to old production company table
                        company_result = await db.execute(select(ProductionCompany.name).where(
                            ProductionCompany.id == entity['production_company_id']
                        ))
                        item_dict["production_company_name"] = company_result.scalar()
                
                # Handle entity_id based on entity_type
                if 'entity_type' in entity and 'entity_id' in entity and entity['entity_id']:
                    # Initialize league sport fields
                    item_dict["league_id"] = None
                    item_dict["league_name"] = None
                    item_dict["league_sport"] = None
                    
                    if entity['entity_type'].lower() == "league":
                        entity_result = await db.execute(select(League.name, League.id, League.sport).where(League.id == entity['entity_id']))
                        league_data = entity_result.first()
                        if league_data:
                            item_dict["entity_name"] = league_data[0]
                            item_dict["league_id"] = league_data[1]
                            item_dict["league_name"] = league_data[0]
                            item_dict["league_sport"] = league_data[2]
                    elif entity['entity_type'].lower() == "team":
                        # First get the team name
                        entity_result = await db.execute(select(Team.name, Team.league_id).where(Team.id == entity['entity_id']))
                        team_data = entity_result.first()
                        if team_data:
                            item_dict["entity_name"] = team_data[0]
                            if team_data[1]:  # If team has a league_id
                                # Get the league info
                                league_result = await db.execute(
                                    select(League.name, League.id, League.sport).where(League.id == team_data[1])
                                )
                                league_data = league_result.first()
                                if league_data:
                                    item_dict["league_id"] = league_data[1]
                                    item_dict["league_name"] = league_data[0]
                                    item_dict["league_sport"] = league_data[2]
                    elif entity['entity_type'].lower() in ("division", "conference", "division_conference"):
                        entity_result = await db.execute(select(DivisionConference.name, DivisionConference.league_id).where(
                            DivisionConference.id == entity['entity_id']
                        ))
                        div_conf_data = entity_result.first()
                        if div_conf_data:
                            item_dict["entity_name"] = div_conf_data[0]
                            if div_conf_data[1]:  # If division has a league_id
                                # Get the league info
                                league_result = await db.execute(
                                    select(League.name, League.id, League.sport).where(League.id == div_conf_data[1])
                                )
                                league_data = league_result.first()
                                if league_data:
                                    item_dict["league_id"] = league_data[1]
                                    item_dict["league_name"] = league_data[0]
                                    item_dict["league_sport"] = league_data[2]
                    elif entity['entity_type'].lower() == "game":
                        item_dict["entity_name"] = await get_game_display_name(db, entity['entity_id'])
                        # Get game's league
                        game_result = await db.execute(
                            select(Game.league_id).where(Game.id == entity['entity_id'])
                        )
                        game_league_id = game_result.scalar()
                        if game_league_id:
                            # Get the league info
                            league_result = await db.execute(
                                select(League.name, League.id, League.sport).where(League.id == game_league_id)
                            )
                            league_data = league_result.first()
                            if league_data:
                                item_dict["league_id"] = league_data[1]
                                item_dict["league_name"] = league_data[0]
                                item_dict["league_sport"] = league_data[2]
                    elif entity['entity_type'].lower() in ('championship', 'playoff', 'playoffs', 'tournament'):
                        # For special entity types, use the entity_type as the entity_name
                        item_dict["entity_name"] = entity['entity_type'].capitalize()
                        
                # Make sure entity_name is never null for production services
                if 'entity_name' not in item_dict or not item_dict['entity_name']:
                    # Try to get the actual entity name again based on entity_type and entity_id
                    if 'entity_type' in entity and 'entity_id' in entity and entity['entity_id']:
                        try:
                            if entity['entity_type'].lower() == "league":
                                entity_result = await db.execute(select(League.name).where(League.id == entity['entity_id']))
                                entity_name = entity_result.scalar()
                                if entity_name:
                                    item_dict["entity_name"] = entity_name
                            elif entity['entity_type'].lower() == "team":
                                entity_result = await db.execute(select(Team.name).where(Team.id == entity['entity_id']))
                                entity_name = entity_result.scalar()
                                if entity_name:
                                    item_dict["entity_name"] = entity_name
                            elif entity['entity_type'].lower() in ("division", "conference", "division_conference"):
                                entity_result = await db.execute(select(DivisionConference.name).where(DivisionConference.id == entity['entity_id']))
                                entity_name = entity_result.scalar()
                                if entity_name:
                                    item_dict["entity_name"] = entity_name
                            elif entity['entity_type'].lower() == "game":
                                game_name = await get_game_display_name(db, entity['entity_id'])
                                if game_name:
                                    item_dict["entity_name"] = game_name
                            elif entity['entity_type'].lower() in ('championship', 'playoff', 'playoffs', 'tournament'):
                                # For special entity types, use the entity_type as the name since there's no table
                                item_dict["entity_name"] = entity['entity_type'].capitalize()
                        except Exception as e:
                            logger.error(f"Error fetching entity name for {entity['entity_type']} with ID {entity['entity_id']}: {e}")
                            
                    # If we still don't have an entity_name, use a fallback
                    if 'entity_name' not in item_dict or not item_dict['entity_name']:
                        item_dict["entity_name"] = "Unknown Entity"
                        
                # Generate a name for production services
                entity_name = item_dict.get("entity_name")
                company_name = item_dict.get("production_company_name")
                
                if entity_name and company_name:
                    item_dict["name"] = f"{company_name} - {entity_name}"
                elif company_name:
                    service_type = entity.get('service_type', 'Service')
                    item_dict["name"] = f"{company_name} - {service_type}"
                else:
                    # Fallback
                    item_dict["name"] = f"Production Service {entity['id']}"
            
            # Handle game broadcasts (has game_id, broadcast_company_id, production_company_id)
            elif entity_type in ['game_broadcast', 'game_broadcasts']:
                if 'game_id' in entity and entity['game_id']:
                    item_dict["game_name"] = await get_game_display_name(db, entity['game_id'])
                
                if 'broadcast_company_id' in entity and entity['broadcast_company_id']:
                    company_result = await db.execute(select(BroadcastCompany.name).where(
                        BroadcastCompany.id == entity['broadcast_company_id']
                    ))
                    item_dict["broadcast_company_name"] = company_result.scalar()
                
                if 'production_company_id' in entity and entity['production_company_id']:
                    company_result = await db.execute(select(ProductionCompany.name).where(
                        ProductionCompany.id == entity['production_company_id']
                    ))
                    item_dict["production_company_name"] = company_result.scalar()
                    
                # Generate a name for game broadcasts
                game_name = item_dict.get("game_name")
                broadcast_company = item_dict.get("broadcast_company_name")
                
                if game_name and broadcast_company:
                    item_dict["name"] = f"{broadcast_company} - {game_name}"
                elif broadcast_company:
                    broadcast_type = entity.get('broadcast_type', 'Broadcast')
                    item_dict["name"] = f"{broadcast_company} - {broadcast_type}"
                else:
                    # Fallback
                    item_dict["name"] = f"Game Broadcast {entity['id']}"
            
            # Handle league executives (has league_id)
            elif entity_type in ['league_executive', 'league_executives']:
                if 'league_id' in entity and entity['league_id']:
                    league_result = await db.execute(select(League.name).where(League.id == entity['league_id']))
                    item_dict["league_name"] = league_result.scalar()
                    
                # Since league executives have a name field already, we can enhance it
                if 'name' in entity and item_dict.get("league_name"):
                    league_name = item_dict.get("league_name")
                    position = entity.get('position', 'Executive')
                    item_dict["name"] = f"{entity['name']} - {position} ({league_name})"
            
            # Handle stadiums (has host_broadcaster_id)
            elif entity_type in ['stadium', 'stadiums']:
                if 'host_broadcaster_id' in entity and entity['host_broadcaster_id']:
                    try:
                        # First try looking up in BroadcastCompany
                        broadcaster_result = await db.execute(
                            select(BroadcastCompany.name).where(BroadcastCompany.id == entity['host_broadcaster_id'])
                        )
                        broadcaster_name = broadcaster_result.scalar()

                        # If not found, try looking up in Brand table
                        if not broadcaster_name:
                            brand_result = await db.execute(
                                select(Brand.name).where(Brand.id == entity['host_broadcaster_id'])
                            )
                            broadcaster_name = brand_result.scalar()
                            
                        item_dict["host_broadcaster_name"] = broadcaster_name
                    except Exception as e:
                        logger.error(f"Error fetching host broadcaster name for stadium {entity.get('id')}: {str(e)}")
                        # Don't let this error affect the rest of the response
                        item_dict["host_broadcaster_name"] = None
            
            # Handle brands - check for partner field
            elif entity_type in ['brand', 'brands']:
                if 'partner' in entity and entity['partner']:
                    item_dict["partner_name"] = entity['partner']
                    
                    # Generate enhanced name if partner exists
                    brand_name = entity.get('name', '')
                    partner_name = entity.get('partner', '')
                    relationship = entity.get('partner_relationship', 'Partner')
                    
                    if brand_name and partner_name:
                        item_dict["relationship_display"] = f"{brand_name} - {relationship} - {partner_name}"
                
        except Exception as e:
            # If we fail to get related names, log error and continue
            logger.error(f"Error fetching related names for {entity_type} with ID {entity.get('id')}: {str(e)}")
        
        return item_dict
    
    @staticmethod
    async def get_entities_with_related_names(
        db: AsyncSession, 
        entity_type: str, 
        entities: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Add related entity names to a list of entities."""
        processed_items = []
        
        for entity in entities:
            processed_entity = await EntityNameResolver.add_related_names(db, entity_type, entity)
            processed_items.append(processed_entity)
        
        return processed_items
    
    @staticmethod
    def get_allowed_fields(entity_type: str) -> set:
        """Get the allowed fields for an entity type, including related name fields."""
        model_class = get_model_for_entity_type(entity_type)
        if not model_class:
            return set()
            
        column_names = [column.name for column in model_class.__table__.columns]
        
        # Add standard fields that are allowed in all entity types
        allowed_fields = set(column_names + ['id', 'name', 'created_at', 'updated_at'])
        
        # Allow relationship name fields for foreign keys that exist in this entity
        for col_name in column_names:
            if col_name.endswith('_id'):
                allowed_fields.add(col_name.replace('_id', '_name'))
                
        # For certain entity types, add additional allowed fields
        if entity_type in ['broadcast_right', 'broadcast_rights', 'broadcast',
                        'production_service', 'production_services', 'production']:
            allowed_fields.add('entity_name')
            allowed_fields.add('entity_type')
            
        # Add league sport information to relevant entity types
        if entity_type in ['broadcast_right', 'broadcast_rights', 'broadcast', 
                          'production_service', 'production_services', 'production',
                          'team', 'teams', 'division_conference', 'divisions_conferences']:
            allowed_fields.add('league_id')
            allowed_fields.add('league_name')
            allowed_fields.add('league_sport')
        
        if entity_type in ['game_broadcast', 'game_broadcasts']:
            allowed_fields.add('game_name')
            
        # Add host_broadcaster_name field for stadium entities
        if entity_type in ['stadium', 'stadiums']:
            allowed_fields.add('host_broadcaster_name')
            
        # Add partner fields for brand entities
        if entity_type in ['brand', 'brands']:
            allowed_fields.add('partner')
            allowed_fields.add('partner_relationship')
            allowed_fields.add('partner_name')
            allowed_fields.add('relationship_display')
        
        return allowed_fields
    
    @staticmethod
    def clean_entity_fields(entity_type: str, entity: Dict[str, Any]) -> Dict[str, Any]:
        """Remove fields that are not allowed for this entity type."""
        allowed_fields = EntityNameResolver.get_allowed_fields(entity_type)
        
        return {
            key: value for key, value in entity.items() 
            if key in allowed_fields
        }
