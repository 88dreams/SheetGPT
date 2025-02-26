#!/usr/bin/env python
import asyncio
import sys
import uuid
from datetime import datetime, timedelta, date
from pathlib import Path
from typing import Dict, List, Optional

# Add the project root to the Python path
sys.path.append(str(Path(__file__).parent.parent.parent))

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from src.utils.config import get_settings

# Sample data
LEAGUES = [
    {"name": "National Football League", "sport": "Football", "country": "USA"},
    {"name": "Major League Baseball", "sport": "Baseball", "country": "USA"},
    {"name": "National Basketball Association", "sport": "Basketball", "country": "USA"},
    {"name": "National Hockey League", "sport": "Hockey", "country": "USA/Canada"},
    {"name": "Major League Soccer", "sport": "Soccer", "country": "USA/Canada"}
]

STADIUMS = [
    {"name": "SoFi Stadium", "city": "Los Angeles", "state": "CA", "country": "USA", "capacity": 70240, "owner": "Kroenke Sports & Entertainment", "naming_rights_holder": "SoFi"},
    {"name": "AT&T Stadium", "city": "Arlington", "state": "TX", "country": "USA", "capacity": 80000, "owner": "City of Arlington", "naming_rights_holder": "AT&T"},
    {"name": "Yankee Stadium", "city": "New York", "state": "NY", "country": "USA", "capacity": 54251, "owner": "New York City", "naming_rights_holder": "Yankees"},
    {"name": "Madison Square Garden", "city": "New York", "state": "NY", "country": "USA", "capacity": 20789, "owner": "Madison Square Garden Sports", "naming_rights_holder": "Madison Square Garden"},
    {"name": "Fenway Park", "city": "Boston", "state": "MA", "country": "USA", "capacity": 37755, "owner": "Fenway Sports Group", "naming_rights_holder": "Fenway"},
    {"name": "Staples Center", "city": "Los Angeles", "state": "CA", "country": "USA", "capacity": 19079, "owner": "AEG", "naming_rights_holder": "Staples"},
    {"name": "Wrigley Field", "city": "Chicago", "state": "IL", "country": "USA", "capacity": 41649, "owner": "Ricketts family", "naming_rights_holder": "Wrigley"},
    {"name": "Lumen Field", "city": "Seattle", "state": "WA", "country": "USA", "capacity": 69000, "owner": "Washington State Public Stadium Authority", "naming_rights_holder": "Lumen Technologies"},
    {"name": "Minute Maid Park", "city": "Houston", "state": "TX", "country": "USA", "capacity": 41168, "owner": "Harris County-Houston Sports Authority", "naming_rights_holder": "Minute Maid"},
    {"name": "Chase Center", "city": "San Francisco", "state": "CA", "country": "USA", "capacity": 18064, "owner": "GSW Arena LLC", "naming_rights_holder": "Chase"}
]

TEAMS = [
    # NFL Teams
    {"name": "Los Angeles Rams", "city": "Los Angeles", "state": "CA", "country": "USA", "founded_year": 1936, "league_index": 0, "stadium_index": 0},
    {"name": "Dallas Cowboys", "city": "Dallas", "state": "TX", "country": "USA", "founded_year": 1960, "league_index": 0, "stadium_index": 1},
    {"name": "Seattle Seahawks", "city": "Seattle", "state": "WA", "country": "USA", "founded_year": 1974, "league_index": 0, "stadium_index": 7},
    
    # MLB Teams
    {"name": "New York Yankees", "city": "New York", "state": "NY", "country": "USA", "founded_year": 1901, "league_index": 1, "stadium_index": 2},
    {"name": "Boston Red Sox", "city": "Boston", "state": "MA", "country": "USA", "founded_year": 1901, "league_index": 1, "stadium_index": 4},
    {"name": "Chicago Cubs", "city": "Chicago", "state": "IL", "country": "USA", "founded_year": 1876, "league_index": 1, "stadium_index": 6},
    {"name": "Houston Astros", "city": "Houston", "state": "TX", "country": "USA", "founded_year": 1962, "league_index": 1, "stadium_index": 8},
    
    # NBA Teams
    {"name": "Los Angeles Lakers", "city": "Los Angeles", "state": "CA", "country": "USA", "founded_year": 1947, "league_index": 2, "stadium_index": 5},
    {"name": "New York Knicks", "city": "New York", "state": "NY", "country": "USA", "founded_year": 1946, "league_index": 2, "stadium_index": 3},
    {"name": "Golden State Warriors", "city": "San Francisco", "state": "CA", "country": "USA", "founded_year": 1946, "league_index": 2, "stadium_index": 9}
]

BROADCAST_COMPANIES = [
    {"name": "ESPN", "parent_company": "Disney"},
    {"name": "Fox Sports", "parent_company": "Fox Corporation"},
    {"name": "NBC Sports", "parent_company": "NBCUniversal"},
    {"name": "CBS Sports", "parent_company": "ViacomCBS"},
    {"name": "Turner Sports", "parent_company": "WarnerMedia"}
]

PRODUCTION_COMPANIES = [
    {"name": "NEP Group", "headquarters": "Pittsburgh, PA"},
    {"name": "Game Creek Video", "headquarters": "Hudson, NH"},
    {"name": "F&F Productions", "headquarters": "Clearwater, FL"},
    {"name": "Mobile TV Group", "headquarters": "Denver, CO"}
]

BRANDS = [
    {"name": "Nike", "industry": "Sportswear"},
    {"name": "Gatorade", "industry": "Beverages"},
    {"name": "Adidas", "industry": "Sportswear"},
    {"name": "Under Armour", "industry": "Sportswear"},
    {"name": "Pepsi", "industry": "Beverages"},
    {"name": "Coca-Cola", "industry": "Beverages"},
    {"name": "State Farm", "industry": "Insurance"},
    {"name": "Verizon", "industry": "Telecommunications"}
]

async def create_sample_data():
    """Create sample data for the sports database."""
    # Get database URL from settings
    settings = get_settings()
    database_url = settings.DATABASE_URL
    
    # Override with local database URL for direct execution
    if 'db:5432' in database_url:
        database_url = database_url.replace('db:5432', 'localhost:5432')
        print(f"Using local database URL: {database_url}")
    
    # Create async engine
    engine = create_async_engine(database_url)
    
    try:
        # Check if data already exists
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT COUNT(*) FROM leagues"))
            count = result.scalar()
            if count > 0:
                print(f"Data already exists ({count} leagues found). Checking data completeness...")
                
                # Check if all tables have data
                tables = ["leagues", "teams", "stadiums", "players", "games", 
                          "broadcast_companies", "broadcast_rights", 
                          "production_companies", "production_services",
                          "brands", "brand_relationships"]
                
                for table in tables:
                    try:
                        result = await conn.execute(text(f"SELECT COUNT(*) FROM {table}"))
                        table_count = result.scalar()
                        print(f"  - {table}: {table_count} records")
                    except Exception as e:
                        print(f"  - {table}: Error - {str(e)}")
                
                # If we have leagues but missing other data, we'll continue with insertion
                try:
                    if all(await conn.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar() > 0 for table in tables):
                        print("All tables have data. Skipping data insertion.")
                        return
                    else:
                        print("Some tables are missing data. Continuing with data insertion...")
                except Exception as e:
                    print(f"Error checking tables: {str(e)}")
                    print("Continuing with data insertion...")
            else:
                print("No leagues found. Creating sample data...")
        
        # Insert sample data
        async with engine.begin() as conn:
            # Insert broadcast companies first (needed for stadiums)
            broadcast_company_ids = []
            for company in BROADCAST_COMPANIES:
                company_id = str(uuid.uuid4())
                broadcast_company_ids.append(company_id)
                now = date.today()
                await conn.execute(
                    text("""
                        INSERT INTO broadcast_companies (id, name, parent_company, created_at, updated_at)
                        VALUES (:id, :name, :parent_company, :created_at, :updated_at)
                        ON CONFLICT (id) DO NOTHING
                    """),
                    {
                        "id": company_id,
                        "name": company["name"],
                        "parent_company": company["parent_company"],
                        "created_at": now,
                        "updated_at": now
                    }
                )
            print(f"Inserted {len(BROADCAST_COMPANIES)} broadcast companies.")
            
            # Insert leagues
            league_ids = []
            for league in LEAGUES:
                league_id = str(uuid.uuid4())
                league_ids.append(league_id)
                now = date.today()
                broadcast_start = now - timedelta(days=30)
                broadcast_end = now + timedelta(days=365)
                await conn.execute(
                    text("""
                        INSERT INTO leagues (id, name, sport, country, broadcast_start_date, broadcast_end_date, created_at, updated_at)
                        VALUES (:id, :name, :sport, :country, :broadcast_start_date, :broadcast_end_date, :created_at, :updated_at)
                        ON CONFLICT (id) DO NOTHING
                    """),
                    {
                        "id": league_id,
                        "name": league["name"],
                        "sport": league["sport"],
                        "country": league["country"],
                        "broadcast_start_date": broadcast_start,
                        "broadcast_end_date": broadcast_end,
                        "created_at": now,
                        "updated_at": now
                    }
                )
            print(f"Inserted {len(LEAGUES)} leagues.")
            
            # Insert stadiums
            stadium_ids = []
            for stadium in STADIUMS:
                stadium_id = str(uuid.uuid4())
                stadium_ids.append(stadium_id)
                now = date.today()
                host_broadcaster_id = broadcast_company_ids[len(stadium_ids) % len(broadcast_company_ids)]
                await conn.execute(
                    text("""
                        INSERT INTO stadiums (id, name, city, state, country, capacity, owner, naming_rights_holder, host_broadcaster_id, created_at, updated_at)
                        VALUES (:id, :name, :city, :state, :country, :capacity, :owner, :naming_rights_holder, :host_broadcaster_id, :created_at, :updated_at)
                        ON CONFLICT (id) DO NOTHING
                    """),
                    {
                        "id": stadium_id,
                        "name": stadium["name"],
                        "city": stadium["city"],
                        "state": stadium["state"],
                        "country": stadium["country"],
                        "capacity": stadium["capacity"],
                        "owner": stadium["owner"],
                        "naming_rights_holder": stadium["naming_rights_holder"],
                        "host_broadcaster_id": host_broadcaster_id,
                        "created_at": now,
                        "updated_at": now
                    }
                )
            print(f"Inserted {len(STADIUMS)} stadiums.")
            
            # Insert teams
            team_ids = []
            for team in TEAMS:
                team_id = str(uuid.uuid4())
                team_ids.append(team_id)
                now = date.today()
                await conn.execute(
                    text("""
                        INSERT INTO teams (id, name, city, state, country, founded_year, league_id, stadium_id, created_at, updated_at)
                        VALUES (:id, :name, :city, :state, :country, :founded_year, :league_id, :stadium_id, :created_at, :updated_at)
                        ON CONFLICT (id) DO NOTHING
                    """),
                    {
                        "id": team_id,
                        "name": team["name"],
                        "city": team["city"],
                        "state": team["state"],
                        "country": team["country"],
                        "founded_year": team["founded_year"],
                        "league_id": league_ids[team["league_index"]],
                        "stadium_id": stadium_ids[team["stadium_index"]],
                        "created_at": now,
                        "updated_at": now
                    }
                )
            print(f"Inserted {len(TEAMS)} teams.")
            
            # Insert production companies
            production_company_ids = []
            for company in PRODUCTION_COMPANIES:
                company_id = str(uuid.uuid4())
                production_company_ids.append(company_id)
                now = date.today()
                await conn.execute(
                    text("""
                        INSERT INTO production_companies (id, name, headquarters, created_at, updated_at)
                        VALUES (:id, :name, :headquarters, :created_at, :updated_at)
                        ON CONFLICT (id) DO NOTHING
                    """),
                    {
                        "id": company_id,
                        "name": company["name"],
                        "headquarters": company["headquarters"],
                        "created_at": now,
                        "updated_at": now
                    }
                )
            print(f"Inserted {len(PRODUCTION_COMPANIES)} production companies.")
            
            # Insert brands
            brand_ids = []
            for brand in BRANDS:
                brand_id = str(uuid.uuid4())
                brand_ids.append(brand_id)
                now = date.today()
                await conn.execute(
                    text("""
                        INSERT INTO brands (id, name, industry, created_at, updated_at)
                        VALUES (:id, :name, :industry, :created_at, :updated_at)
                        ON CONFLICT (id) DO NOTHING
                    """),
                    {
                        "id": brand_id,
                        "name": brand["name"],
                        "industry": brand["industry"],
                        "created_at": now,
                        "updated_at": now
                    }
                )
            print(f"Inserted {len(BRANDS)} brands.")
            
            # Insert broadcast rights for leagues
            for i, league_id in enumerate(league_ids):
                company_id = broadcast_company_ids[i % len(broadcast_company_ids)]
                now = date.today()
                start_date = now - timedelta(days=365)
                end_date = now + timedelta(days=365 * 5)
                await conn.execute(
                    text("""
                        INSERT INTO broadcast_rights (id, broadcast_company_id, entity_type, entity_id, 
                                                     start_date, end_date, created_at, updated_at)
                        VALUES (:id, :broadcast_company_id, :entity_type, :entity_id, 
                                :start_date, :end_date, :created_at, :updated_at)
                        ON CONFLICT (id) DO NOTHING
                    """),
                    {
                        "id": str(uuid.uuid4()),
                        "broadcast_company_id": company_id,
                        "entity_type": "league",
                        "entity_id": league_id,
                        "start_date": start_date,
                        "end_date": end_date,
                        "created_at": now,
                        "updated_at": now
                    }
                )
            print(f"Inserted broadcast rights for {len(league_ids)} leagues.")
            
            # Insert production services for leagues
            for i, league_id in enumerate(league_ids):
                company_id = production_company_ids[i % len(production_company_ids)]
                now = date.today()
                start_date = now - timedelta(days=180)
                end_date = now + timedelta(days=365 * 3)
                await conn.execute(
                    text("""
                        INSERT INTO production_services (id, production_company_id, entity_type, entity_id, 
                                                       start_date, end_date, created_at, updated_at)
                        VALUES (:id, :production_company_id, :entity_type, :entity_id, 
                                :start_date, :end_date, :created_at, :updated_at)
                        ON CONFLICT (id) DO NOTHING
                    """),
                    {
                        "id": str(uuid.uuid4()),
                        "production_company_id": company_id,
                        "entity_type": "league",
                        "entity_id": league_id,
                        "start_date": start_date,
                        "end_date": end_date,
                        "created_at": now,
                        "updated_at": now
                    }
                )
            print(f"Inserted production services for {len(league_ids)} leagues.")
            
            # Insert brand relationships for teams
            for i, team_id in enumerate(team_ids):
                brand_id = brand_ids[i % len(brand_ids)]
                now = date.today()
                start_date = now - timedelta(days=90)
                end_date = now + timedelta(days=365 * 2)
                await conn.execute(
                    text("""
                        INSERT INTO brand_relationships (id, brand_id, entity_type, entity_id, 
                                                       relationship_type, start_date, end_date, 
                                                       created_at, updated_at)
                        VALUES (:id, :brand_id, :entity_type, :entity_id, 
                                :relationship_type, :start_date, :end_date, 
                                :created_at, :updated_at)
                        ON CONFLICT (id) DO NOTHING
                    """),
                    {
                        "id": str(uuid.uuid4()),
                        "brand_id": brand_id,
                        "entity_type": "team",
                        "entity_id": team_id,
                        "relationship_type": "sponsor",
                        "start_date": start_date,
                        "end_date": end_date,
                        "created_at": now,
                        "updated_at": now
                    }
                )
            print(f"Inserted brand relationships for {len(team_ids)} teams.")
            
            # Create some games
            for i in range(20):
                # Get random teams from the same league
                league_index = i % len(LEAGUES)
                teams_in_league = [idx for idx, team in enumerate(TEAMS) if team["league_index"] == league_index]
                
                if len(teams_in_league) < 2:
                    continue
                
                home_team_idx = teams_in_league[i % len(teams_in_league)]
                away_team_idx = teams_in_league[(i + 1) % len(teams_in_league)]
                
                if home_team_idx == away_team_idx:
                    continue
                
                home_team_id = team_ids[home_team_idx]
                away_team_id = team_ids[away_team_idx]
                stadium_id = stadium_ids[TEAMS[home_team_idx]["stadium_index"]]
                
                # Game date (some in past, some in future)
                days_offset = (i - 10) * 7  # Some games in past, some in future
                game_date = datetime.utcnow() + timedelta(days=days_offset)
                
                # Scores for past games
                home_score = None
                away_score = None
                status = "scheduled"
                
                if days_offset < 0:
                    home_score = 70 + (i * 3) % 30
                    away_score = 65 + (i * 7) % 35
                    status = "completed"
                
                now = datetime.utcnow()
                await conn.execute(
                    text("""
                        INSERT INTO games (id, date, home_team_id, away_team_id, stadium_id,
                                         home_score, away_score, status, created_at, updated_at)
                        VALUES (:id, :date, :home_team_id, :away_team_id, :stadium_id,
                                :home_score, :away_score, :status, :created_at, :updated_at)
                        ON CONFLICT (id) DO NOTHING
                    """),
                    {
                        "id": str(uuid.uuid4()),
                        "date": game_date,
                        "home_team_id": home_team_id,
                        "away_team_id": away_team_id,
                        "stadium_id": stadium_id,
                        "home_score": home_score,
                        "away_score": away_score,
                        "status": status,
                        "created_at": now,
                        "updated_at": now
                    }
                )
            print("Inserted games successfully.")
            
            # Create some players
            positions = ["QB", "RB", "WR", "TE", "OL", "DL", "LB", "CB", "S", "K", "P"]
            first_names = ["James", "John", "Robert", "Michael", "William", "David", "Richard", "Joseph", "Thomas", "Charles"]
            last_names = ["Smith", "Johnson", "Williams", "Jones", "Brown", "Davis", "Miller", "Wilson", "Moore", "Taylor"]
            
            for team_id in team_ids:
                # Add 5 players per team
                for i in range(5):
                    player_id = str(uuid.uuid4())
                    first_name = first_names[i % len(first_names)]
                    last_name = last_names[(i + team_ids.index(team_id)) % len(last_names)]
                    name = f"{first_name} {last_name}"
                    position = positions[i % len(positions)]
                    number = 10 + i * 5
                    
                    now = datetime.utcnow()
                    await conn.execute(
                        text("""
                            INSERT INTO players (id, name, position, number, team_id, created_at, updated_at)
                            VALUES (:id, :name, :position, :number, :team_id, :created_at, :updated_at)
                            ON CONFLICT (id) DO NOTHING
                        """),
                        {
                            "id": player_id,
                            "name": name,
                            "position": position,
                            "number": number,
                            "team_id": team_id,
                            "created_at": now,
                            "updated_at": now
                        }
                    )
            print("Inserted players successfully.")
            
            print("Sample data created successfully!")
    except Exception as e:
        print(f"Error creating sample data: {str(e)}")
        import traceback
        print(traceback.format_exc())

if __name__ == "__main__":
    asyncio.run(create_sample_data())