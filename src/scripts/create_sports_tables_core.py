import asyncio
import os
import sys
from pathlib import Path

# Add the project root to the Python path
sys.path.append(str(Path(__file__).parent.parent.parent))

from sqlalchemy import (
    MetaData, Table, Column, String, Integer, Boolean, ForeignKey, 
    Date, Text, Numeric, create_engine
)
from sqlalchemy.dialects.postgresql import UUID
from uuid import uuid4
from src.utils.config import get_settings

# Create metadata object
metadata = MetaData()

# Define tables
leagues = Table(
    'leagues',
    metadata,
    Column('id', UUID, primary_key=True, default=uuid4),
    Column('name', String(100), nullable=False),
    Column('sport', String(50), nullable=False),
    Column('country', String(100), nullable=False),
    Column('broadcast_start_date', Date, nullable=True),
    Column('broadcast_end_date', Date, nullable=True),
    Column('created_at', Date, nullable=True),
    Column('updated_at', Date, nullable=True)
)

stadiums = Table(
    'stadiums',
    metadata,
    Column('id', UUID, primary_key=True, default=uuid4),
    Column('name', String(100), nullable=False),
    Column('city', String(100), nullable=False),
    Column('state', String(100), nullable=True),
    Column('country', String(100), nullable=False),
    Column('capacity', Integer, nullable=True),
    Column('owner', String(100), nullable=True),
    Column('naming_rights_holder', String(100), nullable=True),
    Column('host_broadcaster_id', UUID, ForeignKey('broadcast_companies.id'), nullable=True),
    Column('created_at', Date, nullable=True),
    Column('updated_at', Date, nullable=True)
)

teams = Table(
    'teams',
    metadata,
    Column('id', UUID, primary_key=True, default=uuid4),
    Column('league_id', UUID, ForeignKey('leagues.id'), nullable=False),
    Column('stadium_id', UUID, ForeignKey('stadiums.id'), nullable=False),
    Column('name', String(100), nullable=False),
    Column('city', String(100), nullable=False),
    Column('state', String(100), nullable=True),
    Column('country', String(100), nullable=False),
    Column('founded_year', Integer, nullable=True),
    Column('created_at', Date, nullable=True),
    Column('updated_at', Date, nullable=True)
)

players = Table(
    'players',
    metadata,
    Column('id', UUID, primary_key=True, default=uuid4),
    Column('team_id', UUID, ForeignKey('teams.id'), nullable=False),
    Column('name', String(100), nullable=False),
    Column('position', String(50), nullable=False),
    Column('jersey_number', Integer, nullable=True),
    Column('college', String(100), nullable=True),
    Column('created_at', Date, nullable=True),
    Column('updated_at', Date, nullable=True)
)

games = Table(
    'games',
    metadata,
    Column('id', UUID, primary_key=True, default=uuid4),
    Column('league_id', UUID, ForeignKey('leagues.id'), nullable=False),
    Column('home_team_id', UUID, ForeignKey('teams.id'), nullable=False),
    Column('away_team_id', UUID, ForeignKey('teams.id'), nullable=False),
    Column('stadium_id', UUID, ForeignKey('stadiums.id'), nullable=False),
    Column('date', Date, nullable=False),
    Column('time', String(10), nullable=True),
    Column('home_score', Integer, nullable=True),
    Column('away_score', Integer, nullable=True),
    Column('status', String(50), nullable=False, default="Scheduled"),
    Column('season_year', Integer, nullable=False),
    Column('season_type', String(50), nullable=False, default="Regular Season"),
    Column('created_at', Date, nullable=True),
    Column('updated_at', Date, nullable=True)
)

broadcast_companies = Table(
    'broadcast_companies',
    metadata,
    Column('id', UUID, primary_key=True, default=uuid4),
    Column('name', String(100), nullable=False),
    Column('type', String(50), nullable=False),
    Column('country', String(100), nullable=False),
    Column('created_at', Date, nullable=True),
    Column('updated_at', Date, nullable=True)
)

broadcast_rights = Table(
    'broadcast_rights',
    metadata,
    Column('id', UUID, primary_key=True, default=uuid4),
    Column('entity_type', String(50), nullable=False),
    Column('entity_id', String(36), nullable=False),
    Column('broadcast_company_id', UUID, ForeignKey('broadcast_companies.id'), nullable=False),
    Column('territory', String(100), nullable=False),
    Column('start_date', Date, nullable=False),
    Column('end_date', Date, nullable=False),
    Column('is_exclusive', Boolean, default=False, nullable=False),
    Column('created_at', Date, nullable=True),
    Column('updated_at', Date, nullable=True)
)

production_companies = Table(
    'production_companies',
    metadata,
    Column('id', UUID, primary_key=True, default=uuid4),
    Column('name', String(100), nullable=False),
    Column('created_at', Date, nullable=True),
    Column('updated_at', Date, nullable=True)
)

production_services = Table(
    'production_services',
    metadata,
    Column('id', UUID, primary_key=True, default=uuid4),
    Column('entity_type', String(50), nullable=False),
    Column('entity_id', String(36), nullable=False),
    Column('production_company_id', UUID, ForeignKey('production_companies.id'), nullable=False),
    Column('service_type', String(100), nullable=False),
    Column('start_date', Date, nullable=False),
    Column('end_date', Date, nullable=False),
    Column('created_at', Date, nullable=True),
    Column('updated_at', Date, nullable=True)
)

brands = Table(
    'brands',
    metadata,
    Column('id', UUID, primary_key=True, default=uuid4),
    Column('name', String(100), nullable=False),
    Column('industry', String(100), nullable=False),
    Column('created_at', Date, nullable=True),
    Column('updated_at', Date, nullable=True)
)

brand_relationships = Table(
    'brand_relationships',
    metadata,
    Column('id', UUID, primary_key=True, default=uuid4),
    Column('brand_id', UUID, ForeignKey('brands.id'), nullable=False),
    Column('entity_type', String(50), nullable=False),
    Column('entity_id', String(36), nullable=False),
    Column('relationship_type', String(100), nullable=False),
    Column('start_date', Date, nullable=False),
    Column('end_date', Date, nullable=False),
    Column('created_at', Date, nullable=True),
    Column('updated_at', Date, nullable=True)
)

team_records = Table(
    'team_records',
    metadata,
    Column('id', UUID, primary_key=True, default=uuid4),
    Column('team_id', UUID, ForeignKey('teams.id'), nullable=False),
    Column('season_year', Integer, nullable=False),
    Column('wins', Integer, default=0, nullable=False),
    Column('losses', Integer, default=0, nullable=False),
    Column('ties', Integer, default=0, nullable=False),
    Column('playoff_result', String(100), nullable=True),
    Column('created_at', Date, nullable=True),
    Column('updated_at', Date, nullable=True)
)

team_ownerships = Table(
    'team_ownerships',
    metadata,
    Column('id', UUID, primary_key=True, default=uuid4),
    Column('team_id', UUID, ForeignKey('teams.id'), nullable=False),
    Column('owner_name', String(100), nullable=False),
    Column('ownership_percentage', Numeric(5, 2), nullable=True),
    Column('acquisition_date', Date, nullable=True),
    Column('created_at', Date, nullable=True),
    Column('updated_at', Date, nullable=True)
)

league_executives = Table(
    'league_executives',
    metadata,
    Column('id', UUID, primary_key=True, default=uuid4),
    Column('league_id', UUID, ForeignKey('leagues.id'), nullable=False),
    Column('name', String(100), nullable=False),
    Column('title', String(100), nullable=False),
    Column('start_date', Date, nullable=True),
    Column('created_at', Date, nullable=True),
    Column('updated_at', Date, nullable=True)
)

game_broadcasts = Table(
    'game_broadcasts',
    metadata,
    Column('id', UUID, primary_key=True, default=uuid4),
    Column('game_id', UUID, ForeignKey('games.id'), nullable=False),
    Column('broadcast_company_id', UUID, ForeignKey('broadcast_companies.id'), nullable=False),
    Column('production_company_id', UUID, ForeignKey('production_companies.id'), nullable=True),
    Column('broadcast_type', String(50), nullable=False),
    Column('territory', String(100), nullable=False),
    Column('created_at', Date, nullable=True),
    Column('updated_at', Date, nullable=True)
)

async def create_tables():
    # Get database URL from settings
    settings = get_settings()
    database_url = settings.DATABASE_URL
    
    # Override with local database URL for direct execution
    database_url = "postgresql://postgres:postgres@localhost:5432/sheetgpt"
    
    print(f"Using database URL: {database_url}")
    
    # Create engine
    engine = create_engine(database_url)
    
    # Create tables
    print("Creating tables...")
    metadata.create_all(engine)
    print("Sports database tables created successfully!")

if __name__ == "__main__":
    asyncio.run(create_tables()) 