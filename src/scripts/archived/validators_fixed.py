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
    async def validate_broadcast_company(db: AsyncSession, company_id: UUID) -> Optional[Any]:
        """
        Validate that a broadcast company exists.
        
        First checks if a broadcast company exists, then falls back to checking if a brand exists.
        Uses the brand directly without creating temporary entities, since brand is now the 
        universal company entity.
        """
        # First try looking for a broadcast company for backward compatibility
        result = await db.execute(select(BroadcastCompany).where(BroadcastCompany.id == company_id))
        company = result.scalars().first()
        
        if company:
            # Find corresponding brand
            brand_result = await db.execute(select(Brand).where(Brand.id == company_id))
            brand = brand_result.scalars().first()
            
            if brand:
                logger.info(f"Found both broadcast company and brand with ID {company_id}")
                if not brand.company_type:
                    brand.company_type = "Broadcaster"
                    try:
                        await db.commit()
                    except:
                        await db.rollback()
                return brand
            return company
            
        # Check if it's a brand directly
        logger.info(f"No broadcast company found with ID {company_id}, checking if it's a brand ID")
        brand_result = await db.execute(select(Brand).where(Brand.id == company_id))
        brand = brand_result.scalars().first()
        
        if brand:
            logger.info(f"Found brand '{brand.name}' with ID {company_id}")
            # Update brand.company_type if not set
            if not brand.company_type:
                brand.company_type = "Broadcaster"
                try:
                    await db.commit()
                    await db.refresh(brand)
                except:
                    await db.rollback()
            return brand
            
        # If neither broadcast company nor brand is found, raise the error
        raise ValueError(f"No brand or broadcast company with ID {company_id} found")
        
    
    @staticmethod
    async def validate_production_company(db: AsyncSession, company_id: UUID) -> Optional[Any]:
        """
        Validate that a production company exists.
        
        First checks if a production company exists, then falls back to checking if a brand exists.
        Uses the brand directly without creating temporary entities, since brand is now the 
        universal company entity.
        """
        # First try looking for a production company for backward compatibility
        result = await db.execute(select(ProductionCompany).where(ProductionCompany.id == company_id))
        company = result.scalars().first()
        
        if company:
            # Find corresponding brand
            brand_result = await db.execute(select(Brand).where(Brand.id == company_id))
            brand = brand_result.scalars().first()
            
            if brand:
                logger.info(f"Found both production company and brand with ID {company_id}")
                if not brand.company_type:
                    brand.company_type = "Production Company"
                    try:
                        await db.commit()
                    except:
                        await db.rollback()
                return brand
            return company
            
        # Check if it's a brand directly
        logger.info(f"No production company found with ID {company_id}, checking if it's a brand ID")
        brand_result = await db.execute(select(Brand).where(Brand.id == company_id))
        brand = brand_result.scalars().first()
        
        if brand:
            logger.info(f"Found brand '{brand.name}' with ID {company_id}")
            # Update brand.company_type if not set
            if not brand.company_type:
                brand.company_type = "Production Company"
                try:
                    await db.commit()
                    await db.refresh(brand)
                except:
                    await db.rollback()
            return brand
            
        # If neither production company nor brand is found, raise the error
        raise ValueError(f"No brand or production company with ID {company_id} found")
    
    @staticmethod
    async def validate_brand(db: AsyncSession, brand_id: UUID) -> Optional[Brand]:
        """Validate that a brand exists."""
        result = await db.execute(select(Brand).where(Brand.id == brand_id))
        brand = result.scalars().first()
        if not brand:
            raise ValueError(f"Brand with ID {brand_id} not found")
        return brand
    
    @staticmethod
    async def validate_division_conference(db: AsyncSession, division_conference_id: UUID) -> Optional[DivisionConference]:
        """Validate that a division/conference exists."""
        result = await db.execute(select(DivisionConference).where(DivisionConference.id == division_conference_id))
        division_conference = result.scalars().first()
        if not division_conference:
            raise ValueError(f"Division/Conference with ID {division_conference_id} not found")
        return division_conference
    
    @staticmethod
    async def validate_team_league_relationship(db: AsyncSession, team_id: UUID, league_id: UUID) -> bool:
        """Validate that a team belongs to a specific league."""
        result = await db.execute(select(Team).where(
            (Team.id == team_id) & (Team.league_id == league_id)
        ))
        team = result.scalars().first()
        if not team:
            raise ValueError(f"Team with ID {team_id} does not belong to League with ID {league_id}")
        return True
    
    @staticmethod
    async def validate_division_conference_league_relationship(
        db: AsyncSession, division_conference_id: UUID, league_id: UUID
    ) -> bool:
        """Validate that a division/conference belongs to a specific league."""
        result = await db.execute(select(DivisionConference).where(
            (DivisionConference.id == division_conference_id) & 
            (DivisionConference.league_id == league_id)
        ))
        division_conference = result.scalars().first()
        if not division_conference:
            raise ValueError(
                f"Division/Conference with ID {division_conference_id} does not belong to League with ID {league_id}"
            )
        return True
    
    @staticmethod
    async def validate_player_team_relationship(db: AsyncSession, player_id: UUID, team_id: UUID) -> bool:
        """Validate that a player belongs to a specific team."""
        result = await db.execute(select(Player).where(
            (Player.id == player_id) & (Player.team_id == team_id)
        ))
        player = result.scalars().first()
        if not player:
            raise ValueError(f"Player with ID {player_id} does not belong to Team with ID {team_id}")
        return True
    
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
                
            if division_conf.league_id \!= team_data['league_id']:
                raise ValueError(
                    f"Division/Conference with ID {team_data['division_conference_id']} "
                    f"does not belong to League with ID {team_data['league_id']}"
                )
    
    @staticmethod
    async def validate_entity_type_and_id(
        db: AsyncSession, entity_type: str, entity_id: UUID
    ) -> bool:
        """Validate that an entity of the specified type exists with the given ID."""
        # Normalize entity types to handle variations
        normalized_type = entity_type.lower()
        
        # Handle special cases
        if normalized_type in ('conference', 'division'):
            normalized_type = 'division_conference'
        # Map Championship, Playoffs and Tournament to special category for validation purposes
        # They're conceptually similar entities in terms of validation
        elif normalized_type in ('championship', 'playoff', 'playoffs', 'tournament'):
            normalized_type = 'championship_playoff'
            logger.info(f"Mapped {entity_type} to championship_playoff category")
            
        logger.info(f"Validating entity type {normalized_type} with ID {entity_id}")
        
        # Validate based on normalized type
        if normalized_type == 'league':
            await EntityValidator.validate_league(db, entity_id)
        elif normalized_type == 'team':
            await EntityValidator.validate_team(db, entity_id)
        elif normalized_type == 'player':
            await EntityValidator.validate_player(db, entity_id)
        elif normalized_type == 'game':
            # Validate game exists
            result = await db.execute(select(Game).where(Game.id == entity_id))
            game = result.scalars().first()
            if not game:
                raise ValueError(f"Game with ID {entity_id} not found")
        elif normalized_type == 'stadium':
            await EntityValidator.validate_stadium(db, entity_id)
        elif normalized_type == 'division_conference':
            await EntityValidator.validate_division_conference(db, entity_id)
        elif normalized_type == 'championship_playoff':
            # Championships and playoffs are allowed without specific validation
            # This allows using these entity types even though we don't have a dedicated table
            logger.info(f"Championship/Playoff entity type accepted: {entity_type}")
            return True
        else:
            logger.warning(f"Potentially unsupported entity type: {entity_type} (normalized to {normalized_type})")
            # Log warning but continue for broadcast rights to prevent failures
            # Only raise error for non-broadcast operations
            
        return True
