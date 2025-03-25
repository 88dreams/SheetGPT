"""
Script to ensure all leagues have the sport field set properly.
This is a data migration to support the sport field enhancement.
"""
import asyncio
import logging
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from src.core.config import get_settings
from src.models.sports_models import League

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Sport mappings for common leagues
DEFAULT_SPORTS = {
    "NFL": "Football",
    "NCAA": "Multiple", # Will be updated with specific sports
    "NBA": "Basketball",
    "WNBA": "Basketball",
    "MLB": "Baseball",
    "NHL": "Hockey",
    "MLS": "Soccer",
    "Premier League": "Soccer",
    "La Liga": "Soccer",
    "Bundesliga": "Soccer",
    "Serie A": "Soccer",
    "Ligue 1": "Soccer",
    "ATP": "Tennis",
    "WTA": "Tennis",
    "PGA": "Golf",
    "LPGA": "Golf",
    "Formula 1": "Racing",
    "NASCAR": "Racing",
    "UFC": "MMA",
    "Olympics": "Multiple",
}

# NCAA-specific sports mappings
NCAA_SPORTS = {
    "NCAA Football": "Football",
    "NCAA Basketball": "Basketball",
    "NCAA Baseball": "Baseball",
    "NCAA Soccer": "Soccer",
    "NCAA Volleyball": "Volleyball",
    "NCAA Softball": "Softball",
    "NCAA Lacrosse": "Lacrosse",
    "NCAA Hockey": "Hockey",
    "NCAA Swimming": "Swimming",
    "NCAA Track": "Track & Field",
    "NCAA Wrestling": "Wrestling",
    "NCAA Golf": "Golf",
    "NCAA Tennis": "Tennis",
}

async def update_sports():
    """Update the sport field for leagues that don't have it set."""
    settings = get_settings()
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    
    async with async_session() as session:
        # First, check for leagues with empty sport fields or set to "Unknown Sport"
        query = select(League).where((League.sport == None) | (League.sport == "Unknown Sport"))
        result = await session.execute(query)
        leagues_to_update = result.scalars().all()
        
        # Additional specific league updates to fix incorrect categorizations
        specific_updates = {
            "Women's National Basketball Association": "Basketball",
            "Big Ten": "Multiple - NCAA Conference",
            "Big East": "Multiple - NCAA Conference", 
            "Big 12": "Multiple - NCAA Conference",
            "Pac-12": "Multiple - NCAA Conference",
            "Mountain West": "Multiple - NCAA Conference",
            "West Coast Conference": "Multiple - NCAA Conference",
            "Atlantic 10": "Multiple - NCAA Conference",
            "Missouri Valley Conference": "Multiple - NCAA Conference"
        }
        
        # Get all leagues with incorrect specific mappings
        additional_query = select(League).where(League.name.in_(specific_updates.keys()))
        additional_result = await session.execute(additional_query)
        specific_leagues = additional_result.scalars().all()
        leagues_to_update.extend(specific_leagues)
        
        # Remove duplicates
        seen = set()
        leagues_to_update = [league for league in leagues_to_update 
                             if league.id not in seen and not seen.add(league.id)]
        
        if leagues_to_update:
            logger.info(f"Found {len(leagues_to_update)} leagues to update")
            
            for league in leagues_to_update:
                # Check if it's in our specific mappings
                if league.name in specific_updates:
                    assigned_sport = specific_updates[league.name]
                else:
                    # Try to determine sport based on league name
                    assigned_sport = None
                    
                    # Check for exact matches in our mapping
                    if league.name in DEFAULT_SPORTS:
                        assigned_sport = DEFAULT_SPORTS[league.name]
                    elif league.name in NCAA_SPORTS:
                        assigned_sport = NCAA_SPORTS[league.name]
                    # Check for partial matches
                    else:
                        for key, sport in DEFAULT_SPORTS.items():
                            if key in league.name:
                                assigned_sport = sport
                                break
                        
                        if not assigned_sport:
                            for key, sport in NCAA_SPORTS.items():
                                if key in league.name:
                                    assigned_sport = sport
                                    break
                    
                    # If we couldn't determine the sport, use a default value
                    if not assigned_sport:
                        logger.info(f"Could not determine sport for {league.name}, using 'Unknown'")
                        assigned_sport = "Unknown"
                
                # Update the league
                logger.info(f"Setting sport for {league.name} from '{league.sport}' to '{assigned_sport}'")
                league.sport = assigned_sport
            
            await session.commit()
            logger.info("Sport field updated for all leagues")
        else:
            logger.info("All leagues already have appropriate sport fields set")
        
        # Now print a summary of sports in the database
        query = select(League.sport, League.name)
        result = await session.execute(query)
        leagues = result.all()
        
        sport_mapping = {}
        for sport, name in leagues:
            if sport not in sport_mapping:
                sport_mapping[sport] = []
            sport_mapping[sport].append(name)
        
        logger.info("Summary of sports in the database:")
        for sport, league_names in sport_mapping.items():
            logger.info(f"Sport: {sport} ({len(league_names)} leagues)")
            for name in league_names:
                logger.info(f"  - {name}")

async def main():
    """Main entry point for the script."""
    try:
        await update_sports()
    except Exception as e:
        logger.error(f"Error updating league sports: {e}")
        raise

if __name__ == "__main__":
    asyncio.run(main())