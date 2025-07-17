"""Add sports database models

Revision ID: f626a8bff0f1
Revises: dd72e89e735e
Create Date: 2025-02-25 23:26:14.184259+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql # Import for UUID if needed, though sa.UUID should work

# revision identifiers, used by Alembic.
revision: str = 'f626a8bff0f1'
down_revision: Union[str, None] = 'dd72e89e735e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
    CREATE TABLE IF NOT EXISTS leagues (
        id UUID PRIMARY KEY,
        name VARCHAR,
        nickname VARCHAR,
        sport VARCHAR,
        country VARCHAR,
        broadcast_start_date DATE,
        broadcast_end_date DATE,
        created_at TIMESTAMP WITHOUT TIME ZONE,
        updated_at TIMESTAMP WITHOUT TIME ZONE,
        deleted_at TIMESTAMP WITHOUT TIME ZONE
    );
    CREATE TABLE IF NOT EXISTS divisions_conferences (
        id UUID PRIMARY KEY,
        league_id UUID,
        name VARCHAR,
        nickname VARCHAR,
        type VARCHAR,
        region VARCHAR,
        description TEXT,
        created_at TIMESTAMP WITHOUT TIME ZONE,
        updated_at TIMESTAMP WITHOUT TIME ZONE,
        deleted_at TIMESTAMP WITHOUT TIME ZONE
    );
    CREATE TABLE IF NOT EXISTS stadiums (
        id UUID PRIMARY KEY,
        name VARCHAR,
        city VARCHAR,
        state VARCHAR,
        country VARCHAR,
        capacity INTEGER,
        owner VARCHAR,
        naming_rights_holder VARCHAR,
        host_broadcaster VARCHAR,
        host_broadcaster_id UUID,
        created_at TIMESTAMP WITHOUT TIME ZONE,
        updated_at TIMESTAMP WITHOUT TIME ZONE,
        deleted_at TIMESTAMP WITHOUT TIME ZONE
    );
    CREATE TABLE IF NOT EXISTS brands (
        id UUID PRIMARY KEY,
        name VARCHAR,
        industry VARCHAR,
        company_type VARCHAR,
        country VARCHAR,
        partner VARCHAR,
        partner_relationship VARCHAR,
        representative_entity_type VARCHAR,
        created_at TIMESTAMP WITHOUT TIME ZONE,
        updated_at TIMESTAMP WITHOUT TIME ZONE,
        deleted_at TIMESTAMP WITHOUT TIME ZONE
    );
    CREATE TABLE IF NOT EXISTS teams (
        id UUID PRIMARY KEY,
        league_id UUID,
        division_conference_id UUID,
        stadium_id UUID,
        name VARCHAR,
        city VARCHAR,
        state VARCHAR,
        country VARCHAR,
        founded_year INTEGER,
        created_at TIMESTAMP WITHOUT TIME ZONE,
        updated_at TIMESTAMP WITHOUT TIME ZONE,
        deleted_at TIMESTAMP WITHOUT TIME ZONE
    );
    CREATE TABLE IF NOT EXISTS players (
        id UUID PRIMARY KEY,
        team_id UUID,
        name VARCHAR,
        position VARCHAR,
        jersey_number INTEGER,
        college VARCHAR,
        created_at TIMESTAMP WITHOUT TIME ZONE,
        updated_at TIMESTAMP WITHOUT TIME ZONE,
        deleted_at TIMESTAMP WITHOUT TIME ZONE
    );
    CREATE TABLE IF NOT EXISTS games (
        id UUID PRIMARY KEY,
        league_id UUID,
        home_team_id UUID,
        away_team_id UUID,
        stadium_id UUID,
        date DATE,
        time VARCHAR,
        home_score INTEGER,
        away_score INTEGER,
        status VARCHAR,
        season_year INTEGER,
        season_type VARCHAR,
        created_at TIMESTAMP WITHOUT TIME ZONE,
        updated_at TIMESTAMP WITHOUT TIME ZONE,
        deleted_at TIMESTAMP WITHOUT TIME ZONE
    );
    CREATE TABLE IF NOT EXISTS broadcast_companies (
        id UUID PRIMARY KEY,
        name VARCHAR,
        created_at TIMESTAMP WITHOUT TIME ZONE,
        updated_at TIMESTAMP WITHOUT TIME ZONE
    );
    CREATE TABLE IF NOT EXISTS production_companies (
        id UUID PRIMARY KEY,
        name VARCHAR,
        created_at TIMESTAMP WITHOUT TIME ZONE,
        updated_at TIMESTAMP WITHOUT TIME ZONE
    );
    CREATE TABLE IF NOT EXISTS game_broadcasts (
        id UUID PRIMARY KEY,
        game_id UUID,
        broadcast_company_id UUID,
        production_company_id UUID,
        broadcast_type VARCHAR,
        territory VARCHAR,
        start_time VARCHAR,
        end_time VARCHAR,
        created_at TIMESTAMP WITHOUT TIME ZONE,
        updated_at TIMESTAMP WITHOUT TIME ZONE,
        deleted_at TIMESTAMP WITHOUT TIME ZONE
    );
    CREATE TABLE IF NOT EXISTS broadcast_rights (
        id UUID PRIMARY KEY,
        entity_type VARCHAR,
        entity_id UUID,
        broadcast_company_id UUID,
        division_conference_id UUID,
        territory VARCHAR,
        start_date DATE,
        end_date DATE,
        is_exclusive BOOLEAN,
        created_at TIMESTAMP WITHOUT TIME ZONE,
        updated_at TIMESTAMP WITHOUT TIME ZONE,
        deleted_at TIMESTAMP WITHOUT TIME ZONE
    );
    CREATE TABLE IF NOT EXISTS team_records (
        id UUID PRIMARY KEY,
        team_id UUID,
        season_year INTEGER,
        wins INTEGER,
        losses INTEGER,
        ties INTEGER,
        playoff_result VARCHAR,
        created_at TIMESTAMP WITHOUT TIME ZONE,
        updated_at TIMESTAMP WITHOUT TIME ZONE,
        deleted_at TIMESTAMP WITHOUT TIME ZONE
    );
    CREATE TABLE IF NOT EXISTS team_ownerships (
        id UUID PRIMARY KEY,
        team_id UUID,
        owner_name VARCHAR,
        ownership_percentage NUMERIC,
        acquisition_date DATE,
        created_at TIMESTAMP WITHOUT TIME ZONE,
        updated_at TIMESTAMP WITHOUT TIME ZONE,
        deleted_at TIMESTAMP WITHOUT TIME ZONE
    );
    CREATE TABLE IF NOT EXISTS league_executives (
        id UUID PRIMARY KEY,
        league_id UUID,
        name VARCHAR,
        position VARCHAR,
        start_date DATE,
        end_date DATE,
        created_at TIMESTAMP WITHOUT TIME ZONE,
        updated_at TIMESTAMP WITHOUT TIME ZONE,
        deleted_at TIMESTAMP WITHOUT TIME ZONE
    );
    """)

def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS league_executives;")
    op.execute("DROP TABLE IF EXISTS team_ownerships;")
    op.execute("DROP TABLE IF EXISTS team_records;")
    op.execute("DROP TABLE IF EXISTS broadcast_rights;")
    op.execute("DROP TABLE IF EXISTS game_broadcasts;")
    op.execute("DROP TABLE IF EXISTS production_companies;")
    op.execute("DROP TABLE IF EXISTS broadcast_companies;")
    op.execute("DROP TABLE IF EXISTS games;")
    op.execute("DROP TABLE IF EXISTS players;")
    op.execute("DROP TABLE IF EXISTS teams;")
    op.execute("DROP TABLE IF EXISTS brands;")
    op.execute("DROP TABLE IF EXISTS stadiums;")
    op.execute("DROP TABLE IF EXISTS divisions_conferences;")
    op.execute("DROP TABLE IF EXISTS leagues;") 