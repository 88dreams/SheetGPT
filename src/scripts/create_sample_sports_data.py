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
    {"name": "ESPN", "type": "Television", "country": "USA"},
    {"name": "Fox Sports", "type": "Television", "country": "USA"},
    {"name": "NBC Sports", "type": "Television", "country": "USA"},
    {"name": "CBS Sports", "type": "Television", "country": "USA"},
    {"name": "Turner Sports", "type": "Television", "country": "USA"}
]

PRODUCTION_COMPANIES = [
    {"name": "NEP Group"},
    {"name": "Game Creek Video"},
    {"name": "F&F Productions"},
    {"name": "Mobile TV Group"}
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

# Add sample players data
PLAYERS = [
    # NFL Players
    {"name": "Matthew Stafford", "position": "Quarterback", "jersey_number": 9, "team_index": 0},
    {"name": "Cooper Kupp", "position": "Wide Receiver", "jersey_number": 10, "team_index": 0},
    {"name": "Dak Prescott", "position": "Quarterback", "jersey_number": 4, "team_index": 1},
    {"name": "Geno Smith", "position": "Quarterback", "jersey_number": 7, "team_index": 2},
    
    # MLB Players
    {"name": "Aaron Judge", "position": "Right Fielder", "jersey_number": 99, "team_index": 3},
    {"name": "Rafael Devers", "position": "Third Baseman", "jersey_number": 11, "team_index": 4},
    {"name": "Marcus Stroman", "position": "Pitcher", "jersey_number": 0, "team_index": 5},
    {"name": "Jose Altuve", "position": "Second Baseman", "jersey_number": 27, "team_index": 6},
    
    # NBA Players
    {"name": "LeBron James", "position": "Forward", "jersey_number": 23, "team_index": 7},
    {"name": "Jalen Brunson", "position": "Guard", "jersey_number": 11, "team_index": 8},
    {"name": "Stephen Curry", "position": "Guard", "jersey_number": 30, "team_index": 9}
]

async def create_sample_data():
    """Create sample data for the sports database."""
    # Get database URL from settings
    settings = get_settings()
    database_url = settings.DATABASE_URL
    
    # Override with local database URL for direct execution
    if 'db:5432' in database_url:
        print(f"Using database URL with Docker container: {database_url}")
    else:
        database_url = database_url.replace('localhost:5432', 'db:5432')
        print(f"Using database URL: {database_url}")
    
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
                        INSERT INTO broadcast_companies (id, name, type, country, created_at, updated_at)
                        VALUES (:id, :name, :type, :country, :created_at, :updated_at)
                        ON CONFLICT (id) DO NOTHING
                    """),
                    {
                        "id": company_id,
                        "name": company["name"],
                        "type": company["type"],
                        "country": company["country"],
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
                        INSERT INTO production_companies (id, name, created_at, updated_at)
                        VALUES (:id, :name, :created_at, :updated_at)
                        ON CONFLICT (id) DO NOTHING
                    """),
                    {
                        "id": company_id,
                        "name": company["name"],
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
            
            # Insert players
            for player in PLAYERS:
                player_id = str(uuid.uuid4())
                now = date.today()
                await conn.execute(
                    text("""
                        INSERT INTO players (id, team_id, name, position, jersey_number, created_at, updated_at)
                        VALUES (:id, :team_id, :name, :position, :jersey_number, :created_at, :updated_at)
                        ON CONFLICT (id) DO NOTHING
                    """),
                    {
                        "id": player_id,
                        "team_id": team_ids[player["team_index"]],
                        "name": player["name"],
                        "position": player["position"],
                        "jersey_number": player["jersey_number"],
                        "created_at": now,
                        "updated_at": now
                    }
                )
            print(f"Inserted {len(PLAYERS)} players.")
            
            # Insert broadcast rights
            for league_id in league_ids:
                for broadcast_company_id in broadcast_company_ids[:2]:  # Assign rights to first two broadcasters
                    now = date.today()
                    broadcast_right_id = str(uuid.uuid4())
                    await conn.execute(
                        text("""
                            INSERT INTO broadcast_rights 
                            (id, entity_type, entity_id, broadcast_company_id, territory, start_date, end_date, is_exclusive, created_at, updated_at)
                            VALUES (:id, :entity_type, :entity_id, :broadcast_company_id, :territory, :start_date, :end_date, :is_exclusive, :created_at, :updated_at)
                            ON CONFLICT (id) DO NOTHING
                        """),
                        {
                            "id": broadcast_right_id,
                            "entity_type": "League",
                            "entity_id": league_id,
                            "broadcast_company_id": broadcast_company_id,
                            "territory": "United States",
                            "start_date": now,
                            "end_date": now + timedelta(days=365),
                            "is_exclusive": False,
                            "created_at": now,
                            "updated_at": now
                        }
                    )
            print("Inserted broadcast rights for leagues.")
            
            # Insert production services
            for league_id in league_ids:
                for production_company_id in production_company_ids[:2]:  # Assign services to first two production companies
                    now = date.today()
                    production_service_id = str(uuid.uuid4())
                    await conn.execute(
                        text("""
                            INSERT INTO production_services 
                            (id, entity_type, entity_id, production_company_id, service_type, start_date, end_date, created_at, updated_at)
                            VALUES (:id, :entity_type, :entity_id, :production_company_id, :service_type, :start_date, :end_date, :created_at, :updated_at)
                            ON CONFLICT (id) DO NOTHING
                        """),
                        {
                            "id": production_service_id,
                            "entity_type": "League",
                            "entity_id": league_id,
                            "production_company_id": production_company_id,
                            "service_type": "Live Production",
                            "start_date": now,
                            "end_date": now + timedelta(days=365),
                            "created_at": now,
                            "updated_at": now
                        }
                    )
            print("Inserted production services for leagues.")
            
            # Insert games (one game for each team as home team)
            for team_index, team_id in enumerate(team_ids):
                # Find another team from the same league to be the away team
                league_index = TEAMS[team_index]["league_index"]
                away_team_indices = [i for i, t in enumerate(TEAMS) if t["league_index"] == league_index and i != team_index]
                if away_team_indices:
                    away_team_index = away_team_indices[0]
                    game_id = str(uuid.uuid4())
                    now = date.today()
                    game_date = now + timedelta(days=30)  # Schedule game 30 days from now
                    await conn.execute(
                        text("""
                            INSERT INTO games 
                            (id, league_id, home_team_id, away_team_id, stadium_id, date, time, status, season_year, season_type, created_at, updated_at)
                            VALUES (:id, :league_id, :home_team_id, :away_team_id, :stadium_id, :date, :time, :status, :season_year, :season_type, :created_at, :updated_at)
                            ON CONFLICT (id) DO NOTHING
                        """),
                        {
                            "id": game_id,
                            "league_id": league_ids[league_index],
                            "home_team_id": team_id,
                            "away_team_id": team_ids[away_team_index],
                            "stadium_id": stadium_ids[TEAMS[team_index]["stadium_index"]],
                            "date": game_date,
                            "time": "19:00",
                            "status": "Scheduled",
                            "season_year": game_date.year,
                            "season_type": "Regular Season",
                            "created_at": now,
                            "updated_at": now
                        }
                    )
            print(f"Inserted games for {len(team_ids)} teams.")
            
            # Insert brand relationships
            for team_index, team_id in enumerate(team_ids):
                # Assign two random brands to each team
                for brand_id in brand_ids[:2]:
                    now = date.today()
                    brand_relationship_id = str(uuid.uuid4())
                    await conn.execute(
                        text("""
                            INSERT INTO brand_relationships 
                            (id, brand_id, entity_type, entity_id, relationship_type, start_date, end_date, created_at, updated_at)
                            VALUES (:id, :brand_id, :entity_type, :entity_id, :relationship_type, :start_date, :end_date, :created_at, :updated_at)
                            ON CONFLICT (id) DO NOTHING
                        """),
                        {
                            "id": brand_relationship_id,
                            "brand_id": brand_id,
                            "entity_type": "Team",
                            "entity_id": team_id,
                            "relationship_type": "Official Sponsor",
                            "start_date": now,
                            "end_date": now + timedelta(days=365),
                            "created_at": now,
                            "updated_at": now
                        }
                    )
            print(f"Inserted brand relationships for teams.")
            
            print("Sample data created successfully!")
    except Exception as e:
        print(f"Error creating sample data: {str(e)}")
        import traceback
        print(traceback.format_exc())

if __name__ == "__main__":
    asyncio.run(create_sample_data())