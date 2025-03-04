"""Clean up duplicate stadium, league, and team names

Revision ID: cleanup_duplicates
Revises: add_host_broadcaster
Create Date: 2024-02-28 00:00:01.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'cleanup_duplicates'
down_revision: Union[str, None] = 'add_host_broadcaster'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create temporary tables with unique entries
    op.execute("""
        CREATE TEMPORARY TABLE unique_stadiums AS
        SELECT DISTINCT ON (LOWER(name)) id, name
        FROM stadiums
        ORDER BY LOWER(name), created_at
    """)
    
    op.execute("""
        CREATE TEMPORARY TABLE unique_leagues AS
        SELECT DISTINCT ON (LOWER(name)) id, name
        FROM leagues
        ORDER BY LOWER(name), created_at
    """)
    
    op.execute("""
        CREATE TEMPORARY TABLE unique_teams AS
        SELECT DISTINCT ON (LOWER(name)) id, name
        FROM teams
        ORDER BY LOWER(name), created_at
    """)

    # Update foreign keys to point to the first occurrence of each name
    # Update games table for stadium references
    op.execute("""
        UPDATE games g
        SET stadium_id = us.id
        FROM unique_stadiums us
        JOIN stadiums s ON LOWER(s.name) = LOWER(us.name)
        WHERE g.stadium_id = s.id AND s.id != us.id
    """)

    # Update teams table for stadium references
    op.execute("""
        UPDATE teams t
        SET stadium_id = us.id
        FROM unique_stadiums us
        JOIN stadiums s ON LOWER(s.name) = LOWER(us.name)
        WHERE t.stadium_id = s.id AND s.id != us.id
    """)

    # Update games table for league references
    op.execute("""
        UPDATE games g
        SET league_id = ul.id
        FROM unique_leagues ul
        JOIN leagues l ON LOWER(l.name) = LOWER(ul.name)
        WHERE g.league_id = l.id AND l.id != ul.id
    """)

    # Update teams table for league references
    op.execute("""
        UPDATE teams t
        SET league_id = ul.id
        FROM unique_leagues ul
        JOIN leagues l ON LOWER(l.name) = LOWER(ul.name)
        WHERE t.league_id = l.id AND l.id != ul.id
    """)

    # Update games table for team references
    op.execute("""
        UPDATE games g
        SET home_team_id = ut.id
        FROM unique_teams ut
        JOIN teams t ON LOWER(t.name) = LOWER(ut.name)
        WHERE g.home_team_id = t.id AND t.id != ut.id
    """)

    op.execute("""
        UPDATE games g
        SET away_team_id = ut.id
        FROM unique_teams ut
        JOIN teams t ON LOWER(t.name) = LOWER(ut.name)
        WHERE g.away_team_id = t.id AND t.id != ut.id
    """)

    # Delete duplicates
    op.execute("""
        DELETE FROM stadiums s
        WHERE s.id NOT IN (SELECT id FROM unique_stadiums)
    """)

    op.execute("""
        DELETE FROM leagues l
        WHERE l.id NOT IN (SELECT id FROM unique_leagues)
    """)

    op.execute("""
        DELETE FROM teams t
        WHERE t.id NOT IN (SELECT id FROM unique_teams)
    """)

    # Drop temporary tables
    op.execute("DROP TABLE unique_stadiums")
    op.execute("DROP TABLE unique_leagues")
    op.execute("DROP TABLE unique_teams")


def downgrade() -> None:
    # Cannot restore deleted duplicates
    pass 