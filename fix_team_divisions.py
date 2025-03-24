#!/usr/bin/env python3
"""
Script to diagnose and fix team division issues.
"""

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import os
from uuid import UUID

# Database connection string - update if needed
DB_HOST = os.getenv("DB_HOST", "db")  # Changed to db which is the container name
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "sheetgpt")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres")

# Create connection string
DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# Create engine and session
engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)

def diagnose_teams():
    """Check the state of teams and their division assignments."""
    session = Session()
    
    try:
        # Check if teams table exists
        result = session.execute(text("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'teams')"))
        teams_table_exists = result.scalar()
        
        if not teams_table_exists:
            print("Teams table does not exist!")
            return

        # Get count of all teams
        result = session.execute(text("SELECT COUNT(*) FROM teams"))
        total_teams = result.scalar()
        print(f"Total teams in database: {total_teams}")
        
        # Check teams without division_conference_id
        result = session.execute(text(
            "SELECT COUNT(*) FROM teams WHERE division_conference_id IS NULL"
        ))
        teams_without_division = result.scalar()
        print(f"Teams without division_conference_id: {teams_without_division}")
        
        # List these teams
        if teams_without_division > 0:
            print("\nTeams without division_conference_id:")
            result = session.execute(text(
                "SELECT id, name, league_id FROM teams WHERE division_conference_id IS NULL"
            ))
            for row in result:
                print(f"  {row.name} (ID: {row.id}, League ID: {row.league_id})")
        
        # Check available divisions
        result = session.execute(text(
            """
            SELECT dc.id, dc.name, dc.type, l.name as league_name
            FROM divisions_conferences dc
            JOIN leagues l ON dc.league_id = l.id
            """
        ))
        
        print("\nAvailable divisions/conferences:")
        divisions = []
        for row in result:
            print(f"  {row.name} (ID: {row.id}, Type: {row.type}, League: {row.league_name})")
            divisions.append((row.id, row.name, row.league_name))
        
        if teams_without_division > 0 and divisions:
            print("\nWould you like to assign divisions to teams without one? (y/n)")
            choice = input().lower()
            
            if choice == 'y':
                fix_missing_divisions(session, divisions)
    
    finally:
        session.close()

def fix_missing_divisions(session, divisions):
    """Assign divisions to teams without a division."""
    
    # Get leagues and their divisions
    league_divisions = {}
    for div_id, div_name, league_name in divisions:
        if league_name not in league_divisions:
            league_divisions[league_name] = []
        league_divisions[league_name].append((div_id, div_name))
    
    # Get teams without divisions
    result = session.execute(text(
        """
        SELECT t.id, t.name, l.id as league_id, l.name as league_name
        FROM teams t
        JOIN leagues l ON t.league_id = l.id
        WHERE t.division_conference_id IS NULL
        """
    ))
    
    teams_to_update = []
    for row in result:
        team_id = row.id
        team_name = row.name
        league_name = row.league_name
        
        if league_name in league_divisions and league_divisions[league_name]:
            # Just pick the first division for this league
            div_id, div_name = league_divisions[league_name][0]
            
            teams_to_update.append({
                'team_id': team_id,
                'team_name': team_name,
                'division_id': div_id,
                'division_name': div_name
            })
    
    if not teams_to_update:
        print("No teams need to be updated.")
        return
    
    print(f"\nWill update {len(teams_to_update)} teams:")
    for team in teams_to_update:
        print(f"  {team['team_name']} → {team['division_name']}")
    
    print("\nProceed with updates? (y/n)")
    choice = input().lower()
    
    if choice != 'y':
        print("Update cancelled.")
        return
    
    # Update teams
    for team in teams_to_update:
        session.execute(text(
            """
            UPDATE teams 
            SET division_conference_id = :division_id
            WHERE id = :team_id
            """
        ), {"division_id": str(team['division_id']), "team_id": str(team['team_id'])})
    
    session.commit()
    print(f"Successfully updated {len(teams_to_update)} teams with division assignments.")
    
    # Verify the update
    result = session.execute(text("SELECT COUNT(*) FROM teams WHERE division_conference_id IS NULL"))
    remaining = result.scalar()
    print(f"Teams without division_conference_id after update: {remaining}")

if __name__ == "__main__":
    diagnose_teams()