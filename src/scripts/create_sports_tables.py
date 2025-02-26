import asyncio
import os
import sys
from pathlib import Path

# Add the project root to the Python path
sys.path.append(str(Path(__file__).parent.parent.parent))

from sqlalchemy.ext.asyncio import create_async_engine
from src.models.sports_models import (
    League, Stadium, Team, Player, Game, BroadcastCompany, BroadcastRights,
    ProductionCompany, ProductionService, Brand, BrandRelationship,
    TeamRecord, TeamOwnership, LeagueExecutive, GameBroadcast
)
from src.utils.database import Base
from src.utils.config import get_settings

async def create_tables():
    # Get database URL from settings
    settings = get_settings()
    database_url = settings.DATABASE_URL
    
    print(f"Using database URL: {database_url}")
    
    # Create async engine
    engine = create_async_engine(database_url)
    
    # Create tables
    async with engine.begin() as conn:
        # Create tables for all sports models
        await conn.run_sync(Base.metadata.create_all, 
                           tables=[
                               League.__table__,
                               Stadium.__table__,
                               Team.__table__,
                               Player.__table__,
                               Game.__table__,
                               BroadcastCompany.__table__,
                               BroadcastRights.__table__,
                               ProductionCompany.__table__,
                               ProductionService.__table__,
                               Brand.__table__,
                               BrandRelationship.__table__,
                               TeamRecord.__table__,
                               TeamOwnership.__table__,
                               LeagueExecutive.__table__,
                               GameBroadcast.__table__
                           ])
    
    print("Sports database tables created successfully!")

if __name__ == "__main__":
    asyncio.run(create_tables()) 