#!/usr/bin/env python3
"""
Script to create sample division/conference data and update team relationships.
This is used to prepare the data for making division_conference_id required on teams.
"""

from uuid import uuid4
import psycopg2
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database connection string
DB_HOST = os.getenv("DB_HOST", "db")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "sheetgpt")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres")

conn_string = f"host={DB_HOST} port={DB_PORT} dbname={DB_NAME} user={DB_USER} password={DB_PASSWORD}"

def create_sample_divisions_and_update_teams():
    """Create sample divisions/conferences and update team relationships using direct SQL."""
    
    # Connect to the database
    print(f"Connecting to database: {DB_NAME} on {DB_HOST}")
    conn = psycopg2.connect(conn_string)
    
    try:
        with conn:
            with conn.cursor() as cur:
                # Get all leagues
                cur.execute("SELECT id, name, sport FROM leagues")
                leagues = cur.fetchall()
                
                # Dictionary to store league divisions
                league_divisions = {}
                
                # Create divisions for each league
                for league_id, league_name, sport in leagues:
                    print(f"Creating divisions for league: {league_name}")
                    
                    # Different division patterns based on sports
                    if sport.lower() == "football":
                        divisions = [
                            {"name": "AFC East", "type": "Division", "region": "East"},
                            {"name": "AFC North", "type": "Division", "region": "North"},
                            {"name": "AFC South", "type": "Division", "region": "South"},
                            {"name": "AFC West", "type": "Division", "region": "West"},
                            {"name": "NFC East", "type": "Division", "region": "East"},
                            {"name": "NFC North", "type": "Division", "region": "North"},
                            {"name": "NFC South", "type": "Division", "region": "South"},
                            {"name": "NFC West", "type": "Division", "region": "West"},
                        ]
                    elif sport.lower() == "basketball":
                        divisions = [
                            {"name": "Atlantic", "type": "Division", "region": "East"},
                            {"name": "Central", "type": "Division", "region": "East"},
                            {"name": "Southeast", "type": "Division", "region": "East"},
                            {"name": "Northwest", "type": "Division", "region": "West"},
                            {"name": "Pacific", "type": "Division", "region": "West"},
                            {"name": "Southwest", "type": "Division", "region": "West"},
                        ]
                    elif sport.lower() == "baseball":
                        divisions = [
                            {"name": "AL East", "type": "Division", "region": "East"},
                            {"name": "AL Central", "type": "Division", "region": "Central"},
                            {"name": "AL West", "type": "Division", "region": "West"},
                            {"name": "NL East", "type": "Division", "region": "East"},
                            {"name": "NL Central", "type": "Division", "region": "Central"},
                            {"name": "NL West", "type": "Division", "region": "West"},
                        ]
                    elif sport.lower() == "hockey":
                        divisions = [
                            {"name": "Atlantic", "type": "Division", "region": "East"},
                            {"name": "Metropolitan", "type": "Division", "region": "East"},
                            {"name": "Central", "type": "Division", "region": "West"},
                            {"name": "Pacific", "type": "Division", "region": "West"},
                        ]
                    else:
                        # Default divisions for other sports
                        divisions = [
                            {"name": "East", "type": "Division", "region": "East"},
                            {"name": "West", "type": "Division", "region": "West"},
                        ]

                    # Create the division objects and insert into database
                    league_divisions[league_id] = []
                    for division_data in divisions:
                        division_id = str(uuid4())
                        division_name = division_data["name"]
                        division_type = division_data["type"]
                        division_region = division_data["region"]
                        division_description = f"{division_name} division of {league_name}"
                        
                        # Check if division already exists for this league
                        cur.execute(
                            "SELECT id FROM divisions_conferences WHERE league_id = %s AND name = %s",
                            (league_id, division_name)
                        )
                        existing = cur.fetchone()
                        
                        if existing:
                            print(f"Division {division_name} already exists for {league_name}")
                            division_id = existing[0]
                        else:
                            # Insert division
                            cur.execute(
                                """
                                INSERT INTO divisions_conferences 
                                (id, league_id, name, type, region, description, created_at, updated_at)
                                VALUES (%s, %s, %s, %s, %s, %s, NOW(), NOW())
                                """,
                                (division_id, league_id, division_name, division_type, division_region, division_description)
                            )
                        
                        league_divisions[league_id].append(division_id)
                        
                # Get all teams
                cur.execute("SELECT id, league_id, name FROM teams")
                teams = cur.fetchall()
                
                # Assign teams to divisions
                team_count = len(teams)
                print(f"Updating {team_count} teams with division assignments")
                
                for i, (team_id, team_league_id, team_name) in enumerate(teams):
                    if team_league_id in league_divisions and league_divisions[team_league_id]:
                        # Get divisions for this league
                        divisions = league_divisions[team_league_id]
                        # Simple round-robin assignment of teams to divisions
                        division_id = divisions[i % len(divisions)]
                        
                        # Update team with division
                        cur.execute(
                            "UPDATE teams SET division_conference_id = %s WHERE id = %s",
                            (division_id, team_id)
                        )
                        print(f"Assigned team {team_name} to division {division_id}")
                
                print("Division assignments completed successfully.")
    
    finally:
        conn.close()
        print("Database connection closed.")

def main():
    """Main function."""
    create_sample_divisions_and_update_teams()

if __name__ == "__main__":
    main()