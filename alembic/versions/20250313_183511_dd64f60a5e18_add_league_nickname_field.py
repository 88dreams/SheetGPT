"""add_league_nickname_field

Revision ID: dd64f60a5e18
Revises: c1b2744b8cdf
Create Date: 2025-03-13 18:35:11.077638+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'dd64f60a5e18'
down_revision: Union[str, None] = 'c1b2744b8cdf'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add nickname column to leagues table
    op.add_column('leagues', sa.Column('nickname', sa.String(20), nullable=True))
    op.create_index('ix_leagues_nickname', 'leagues', ['nickname'])


def downgrade() -> None:
    # Remove nickname column from leagues table
    op.drop_index('ix_leagues_nickname', table_name='leagues')
    op.drop_column('leagues', 'nickname')
    
    # The original downgrade code below is unnecessary and will be kept only as a comment for reference
    """
    sa.Column('id', sa.UUID(), autoincrement=False, nullable=False),
    sa.Column('game_id', sa.UUID(), autoincrement=False, nullable=False),
    sa.Column('broadcast_company_id', sa.UUID(), autoincrement=False, nullable=False),
    sa.Column('production_company_id', sa.UUID(), autoincrement=False, nullable=True),
    sa.Column('broadcast_type', sa.VARCHAR(length=50), autoincrement=False, nullable=False),
    sa.Column('territory', sa.VARCHAR(length=100), autoincrement=False, nullable=False),
    sa.Column('start_time', sa.VARCHAR(length=50), autoincrement=False, nullable=True),
    sa.Column('end_time', sa.VARCHAR(length=50), autoincrement=False, nullable=True),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=False),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=False),
    sa.Column('deleted_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=True),
    sa.ForeignKeyConstraint(['broadcast_company_id'], ['broadcast_companies.id'], name='game_broadcasts_broadcast_company_id_fkey'),
    sa.ForeignKeyConstraint(['game_id'], ['games.id'], name='game_broadcasts_game_id_fkey'),
    sa.ForeignKeyConstraint(['production_company_id'], ['production_companies.id'], name='game_broadcasts_production_company_id_fkey'),
    sa.PrimaryKeyConstraint('id', name='game_broadcasts_pkey')
    )
    op.create_table('games',
    sa.Column('id', sa.UUID(), autoincrement=False, nullable=False),
    sa.Column('league_id', sa.UUID(), autoincrement=False, nullable=False),
    sa.Column('home_team_id', sa.UUID(), autoincrement=False, nullable=False),
    sa.Column('away_team_id', sa.UUID(), autoincrement=False, nullable=False),
    sa.Column('stadium_id', sa.UUID(), autoincrement=False, nullable=False),
    sa.Column('date', sa.DATE(), autoincrement=False, nullable=False),
    sa.Column('time', sa.VARCHAR(length=10), autoincrement=False, nullable=True),
    sa.Column('home_score', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.Column('away_score', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.Column('status', sa.VARCHAR(length=50), autoincrement=False, nullable=False),
    sa.Column('season_year', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column('season_type', sa.VARCHAR(length=50), autoincrement=False, nullable=False),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=False),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=False),
    sa.Column('deleted_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=True),
    sa.ForeignKeyConstraint(['away_team_id'], ['teams.id'], name='games_away_team_id_fkey'),
    sa.ForeignKeyConstraint(['home_team_id'], ['teams.id'], name='games_home_team_id_fkey'),
    sa.ForeignKeyConstraint(['league_id'], ['leagues.id'], name='games_league_id_fkey'),
    sa.ForeignKeyConstraint(['stadium_id'], ['stadiums.id'], name='games_stadium_id_fkey'),
    sa.PrimaryKeyConstraint('id', name='games_pkey')
    )
    op.create_table('divisions_conferences',
    sa.Column('id', sa.UUID(), autoincrement=False, nullable=False),
    sa.Column('league_id', sa.UUID(), autoincrement=False, nullable=False),
    sa.Column('name', sa.VARCHAR(length=100), autoincrement=False, nullable=False),
    sa.Column('type', sa.VARCHAR(length=50), autoincrement=False, nullable=False),
    sa.Column('region', sa.VARCHAR(length=100), autoincrement=False, nullable=True),
    sa.Column('description', sa.TEXT(), autoincrement=False, nullable=True),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), autoincrement=False, nullable=False),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), autoincrement=False, nullable=False),
    sa.Column('deleted_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=True),
    sa.ForeignKeyConstraint(['league_id'], ['leagues.id'], name='divisions_conferences_league_id_fkey'),
    sa.PrimaryKeyConstraint('id', name='divisions_conferences_pkey'),
    sa.UniqueConstraint('league_id', 'name', name='uq_division_conference_name_per_league'),
    postgresql_ignore_search_path=False
    )
    op.create_index('ix_divisions_conferences_name', 'divisions_conferences', ['name'], unique=False)
    op.create_table('teams',
    sa.Column('id', sa.UUID(), autoincrement=False, nullable=False),
    sa.Column('league_id', sa.UUID(), autoincrement=False, nullable=False),
    sa.Column('stadium_id', sa.UUID(), autoincrement=False, nullable=False),
    sa.Column('name', sa.VARCHAR(length=100), autoincrement=False, nullable=False),
    sa.Column('city', sa.VARCHAR(length=100), autoincrement=False, nullable=False),
    sa.Column('state', sa.VARCHAR(length=100), autoincrement=False, nullable=True),
    sa.Column('country', sa.VARCHAR(length=100), autoincrement=False, nullable=False),
    sa.Column('founded_year', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=False),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=False),
    sa.Column('deleted_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=True),
    sa.Column('division_conference_id', sa.UUID(), autoincrement=False, nullable=False),
    sa.ForeignKeyConstraint(['division_conference_id'], ['divisions_conferences.id'], name='teams_division_conference_id_fkey'),
    sa.ForeignKeyConstraint(['league_id'], ['leagues.id'], name='teams_league_id_fkey'),
    sa.ForeignKeyConstraint(['stadium_id'], ['stadiums.id'], name='teams_stadium_id_fkey'),
    sa.PrimaryKeyConstraint('id', name='teams_pkey'),
    sa.UniqueConstraint('name', name='uq_teams_name'),
    postgresql_ignore_search_path=False
    )
    op.create_index('ix_teams_name', 'teams', ['name'], unique=True)
    op.create_index('ix_teams_division_conference_id', 'teams', ['division_conference_id'], unique=False)
    op.create_table('players',
    sa.Column('id', sa.UUID(), autoincrement=False, nullable=False),
    sa.Column('team_id', sa.UUID(), autoincrement=False, nullable=False),
    sa.Column('name', sa.VARCHAR(length=100), autoincrement=False, nullable=False),
    sa.Column('position', sa.VARCHAR(length=50), autoincrement=False, nullable=False),
    sa.Column('jersey_number', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.Column('college', sa.VARCHAR(length=100), autoincrement=False, nullable=True),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=False),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=False),
    sa.Column('deleted_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=True),
    sa.ForeignKeyConstraint(['team_id'], ['teams.id'], name='players_team_id_fkey'),
    sa.PrimaryKeyConstraint('id', name='players_pkey')
    )
    op.create_table('team_ownerships',
    sa.Column('id', sa.UUID(), autoincrement=False, nullable=False),
    sa.Column('team_id', sa.UUID(), autoincrement=False, nullable=False),
    sa.Column('owner_name', sa.VARCHAR(length=100), autoincrement=False, nullable=False),
    sa.Column('ownership_percentage', sa.NUMERIC(precision=5, scale=2), autoincrement=False, nullable=True),
    sa.Column('acquisition_date', sa.DATE(), autoincrement=False, nullable=True),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=False),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=False),
    sa.Column('deleted_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=True),
    sa.ForeignKeyConstraint(['team_id'], ['teams.id'], name='team_ownerships_team_id_fkey'),
    sa.PrimaryKeyConstraint('id', name='team_ownerships_pkey')
    )
    op.create_table('team_records',
    sa.Column('id', sa.UUID(), autoincrement=False, nullable=False),
    sa.Column('team_id', sa.UUID(), autoincrement=False, nullable=False),
    sa.Column('season_year', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column('wins', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column('losses', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column('ties', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column('playoff_result', sa.VARCHAR(length=100), autoincrement=False, nullable=True),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=False),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=False),
    sa.Column('deleted_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=True),
    sa.ForeignKeyConstraint(['team_id'], ['teams.id'], name='team_records_team_id_fkey'),
    sa.PrimaryKeyConstraint('id', name='team_records_pkey')
    )
    op.create_table('league_executives',
    sa.Column('id', sa.UUID(), autoincrement=False, nullable=False),
    sa.Column('league_id', sa.UUID(), autoincrement=False, nullable=False),
    sa.Column('name', sa.VARCHAR(length=100), autoincrement=False, nullable=False),
    sa.Column('position', sa.VARCHAR(length=100), autoincrement=False, nullable=False),
    sa.Column('start_date', sa.DATE(), autoincrement=False, nullable=True),
    sa.Column('end_date', sa.DATE(), autoincrement=False, nullable=True),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=False),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=False),
    sa.Column('deleted_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=True),
    sa.ForeignKeyConstraint(['league_id'], ['leagues.id'], name='league_executives_league_id_fkey'),
    sa.PrimaryKeyConstraint('id', name='league_executives_pkey')
    )
    op.create_table('broadcast_companies',
    sa.Column('id', sa.UUID(), autoincrement=False, nullable=False),
    sa.Column('name', sa.VARCHAR(length=100), autoincrement=False, nullable=False),
    sa.Column('type', sa.VARCHAR(length=50), autoincrement=False, nullable=False),
    sa.Column('country', sa.VARCHAR(length=100), autoincrement=False, nullable=False),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=False),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=False),
    sa.Column('deleted_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=True),
    sa.PrimaryKeyConstraint('id', name='broadcast_companies_pkey'),
    postgresql_ignore_search_path=False
    )
    op.create_table('stadiums',
    sa.Column('id', sa.UUID(), autoincrement=False, nullable=False),
    sa.Column('name', sa.VARCHAR(length=100), autoincrement=False, nullable=False),
    sa.Column('city', sa.VARCHAR(length=100), autoincrement=False, nullable=False),
    sa.Column('state', sa.VARCHAR(length=100), autoincrement=False, nullable=True),
    sa.Column('country', sa.VARCHAR(length=100), autoincrement=False, nullable=False),
    sa.Column('capacity', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.Column('owner', sa.VARCHAR(length=100), autoincrement=False, nullable=True),
    sa.Column('naming_rights_holder', sa.VARCHAR(length=100), autoincrement=False, nullable=True),
    sa.Column('host_broadcaster_id', sa.UUID(), autoincrement=False, nullable=True),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=False),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=False),
    sa.Column('deleted_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=True),
    sa.Column('host_broadcaster', sa.VARCHAR(length=100), autoincrement=False, nullable=True),
    sa.ForeignKeyConstraint(['host_broadcaster_id'], ['broadcast_companies.id'], name='stadiums_host_broadcaster_id_fkey'),
    sa.PrimaryKeyConstraint('id', name='stadiums_pkey'),
    sa.UniqueConstraint('name', name='uq_stadiums_name')
    )
    op.create_index('ix_stadiums_name', 'stadiums', ['name'], unique=True)
    op.create_table('leagues',
    sa.Column('id', sa.UUID(), autoincrement=False, nullable=False),
    sa.Column('name', sa.VARCHAR(length=100), autoincrement=False, nullable=False),
    sa.Column('sport', sa.VARCHAR(length=50), autoincrement=False, nullable=False),
    sa.Column('country', sa.VARCHAR(length=100), autoincrement=False, nullable=False),
    sa.Column('broadcast_start_date', sa.DATE(), autoincrement=False, nullable=True),
    sa.Column('broadcast_end_date', sa.DATE(), autoincrement=False, nullable=True),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=False),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=False),
    sa.Column('deleted_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=True),
    sa.PrimaryKeyConstraint('id', name='leagues_pkey'),
    sa.UniqueConstraint('name', name='uq_leagues_name'),
    postgresql_ignore_search_path=False
    )
    op.create_index('ix_leagues_name', 'leagues', ['name'], unique=True)
    op.create_table('brand_relationships',
    sa.Column('id', sa.UUID(), autoincrement=False, nullable=False),
    sa.Column('brand_id', sa.UUID(), autoincrement=False, nullable=False),
    sa.Column('entity_type', sa.VARCHAR(length=50), autoincrement=False, nullable=False),
    sa.Column('entity_id', sa.UUID(), autoincrement=False, nullable=False),
    sa.Column('relationship_type', sa.VARCHAR(length=100), autoincrement=False, nullable=False),
    sa.Column('start_date', sa.DATE(), autoincrement=False, nullable=False),
    sa.Column('end_date', sa.DATE(), autoincrement=False, nullable=False),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=False),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=False),
    sa.Column('deleted_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=True),
    sa.ForeignKeyConstraint(['brand_id'], ['brands.id'], name='brand_relationships_brand_id_fkey'),
    sa.PrimaryKeyConstraint('id', name='brand_relationships_pkey')
    )
    op.create_table('broadcast_rights',
    sa.Column('id', sa.UUID(), autoincrement=False, nullable=False),
    sa.Column('entity_type', sa.VARCHAR(length=50), autoincrement=False, nullable=False),
    sa.Column('entity_id', sa.UUID(), autoincrement=False, nullable=False),
    sa.Column('broadcast_company_id', sa.UUID(), autoincrement=False, nullable=False),
    sa.Column('territory', sa.VARCHAR(length=100), autoincrement=False, nullable=False),
    sa.Column('start_date', sa.DATE(), autoincrement=False, nullable=False),
    sa.Column('end_date', sa.DATE(), autoincrement=False, nullable=False),
    sa.Column('is_exclusive', sa.BOOLEAN(), autoincrement=False, nullable=False),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=False),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=False),
    sa.Column('deleted_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=True),
    sa.Column('division_conference_id', sa.UUID(), autoincrement=False, nullable=True),
    sa.ForeignKeyConstraint(['broadcast_company_id'], ['broadcast_companies.id'], name='broadcast_rights_broadcast_company_id_fkey'),
    sa.ForeignKeyConstraint(['division_conference_id'], ['divisions_conferences.id'], name='broadcast_rights_division_conference_id_fkey'),
    sa.PrimaryKeyConstraint('id', name='broadcast_rights_pkey')
    )
    op.create_table('production_companies',
    sa.Column('id', sa.UUID(), autoincrement=False, nullable=False),
    sa.Column('name', sa.VARCHAR(length=100), autoincrement=False, nullable=False),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=False),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=False),
    sa.Column('deleted_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=True),
    sa.PrimaryKeyConstraint('id', name='production_companies_pkey'),
    postgresql_ignore_search_path=False
    )
    op.create_table('brands',
    sa.Column('id', sa.UUID(), autoincrement=False, nullable=False),
    sa.Column('name', sa.VARCHAR(length=100), autoincrement=False, nullable=False),
    sa.Column('industry', sa.VARCHAR(length=100), autoincrement=False, nullable=False),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=False),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=False),
    sa.Column('deleted_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=True),
    sa.PrimaryKeyConstraint('id', name='brands_pkey')
    )
    op.create_table('production_services',
    sa.Column('id', sa.UUID(), autoincrement=False, nullable=False),
    sa.Column('entity_type', sa.VARCHAR(length=50), autoincrement=False, nullable=False),
    sa.Column('entity_id', sa.UUID(), autoincrement=False, nullable=False),
    sa.Column('production_company_id', sa.UUID(), autoincrement=False, nullable=False),
    sa.Column('service_type', sa.VARCHAR(length=100), autoincrement=False, nullable=False),
    sa.Column('start_date', sa.DATE(), autoincrement=False, nullable=False),
    sa.Column('end_date', sa.DATE(), autoincrement=False, nullable=False),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=False),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=False),
    sa.Column('deleted_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=True),
    sa.ForeignKeyConstraint(['production_company_id'], ['production_companies.id'], name='production_services_production_company_id_fkey'),
    sa.PrimaryKeyConstraint('id', name='production_services_pkey')
    )
    """
    # ### end Alembic commands ### 