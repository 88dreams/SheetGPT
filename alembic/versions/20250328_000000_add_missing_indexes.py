"""Add missing database indexes

Revision ID: 20250328_000000
Revises: 20250318_011118_f574bceb9822_add_nickname_to_division_conference
Create Date: 2025-03-28 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20250328_000000'
down_revision = 'update_production_fk'
branch_labels = None
depends_on = None


def upgrade():
    # Add indexes with IF NOT EXISTS to handle already existing indexes
    
    # Helper functions to safely create indexes
    def create_index_if_not_exists(index_name, table_name, columns, unique=False):
        conn = op.get_bind()
        insp = sa.inspect(conn)
        existing_indexes = insp.get_indexes(table_name)
        if index_name not in [idx['name'] for idx in existing_indexes]:
            op.create_index(index_name, table_name, columns, unique=unique)
    
    def execute_if_not_exists(index_name, sql):
        conn = op.get_bind()
        result = conn.execute(sa.text(f"SELECT to_regclass('{index_name}')")).scalar()
        if result is None:  # Index doesn't exist
            op.execute(sql)
    
    # Teams - Frequently used foreign keys
    create_index_if_not_exists('ix_teams_division_conference_id', 'teams', ['division_conference_id'])
    create_index_if_not_exists('ix_teams_league_id', 'teams', ['league_id'])
    
    # Production Services - Polymorphic relationships
    create_index_if_not_exists('ix_production_services_production_company_id', 'production_services', ['production_company_id'])
    create_index_if_not_exists('ix_production_services_entity_type_entity_id', 'production_services', ['entity_type', 'entity_id'])
    
    # Broadcast Rights - Polymorphic relationships
    create_index_if_not_exists('ix_broadcast_rights_entity_type_entity_id', 'broadcast_rights', ['entity_type', 'entity_id'])
    create_index_if_not_exists('ix_broadcast_rights_broadcast_company_id', 'broadcast_rights', ['broadcast_company_id'])
    
    # Games - Commonly filtered fields
    create_index_if_not_exists('ix_games_season_year', 'games', ['season_year'])
    create_index_if_not_exists('ix_games_home_team_id', 'games', ['home_team_id'])
    create_index_if_not_exists('ix_games_away_team_id', 'games', ['away_team_id'])
    
    # Brand Relationships - Polymorphic relationships
    create_index_if_not_exists('ix_brand_relationships_entity_type_entity_id', 'brand_relationships', ['entity_type', 'entity_id'])
    
    # Game Broadcasts - Foreign keys
    create_index_if_not_exists('ix_game_broadcasts_game_id', 'game_broadcasts', ['game_id'])
    create_index_if_not_exists('ix_game_broadcasts_broadcast_company_id', 'game_broadcasts', ['broadcast_company_id'])
    
    # League Executives - Foreign keys
    create_index_if_not_exists('ix_league_executives_league_id', 'league_executives', ['league_id'])
    
    # Players - Name lookup
    create_index_if_not_exists('ix_players_name', 'players', ['name'])
    
    # Team Records - Composite index for team lookups by season
    create_index_if_not_exists('ix_team_records_team_id_season_year', 'team_records', ['team_id', 'season_year'])
    
    # Create functional index for case-insensitive entity_type lookups
    execute_if_not_exists('ix_production_services_entity_type_lower', 
                          'CREATE INDEX ix_production_services_entity_type_lower ON production_services (LOWER(entity_type))')
    execute_if_not_exists('ix_broadcast_rights_entity_type_lower',
                          'CREATE INDEX ix_broadcast_rights_entity_type_lower ON broadcast_rights (LOWER(entity_type))')
    execute_if_not_exists('ix_brand_relationships_entity_type_lower',
                          'CREATE INDEX ix_brand_relationships_entity_type_lower ON brand_relationships (LOWER(entity_type))')


def downgrade():
    # Drop all indexes created in the upgrade function
    op.drop_index('ix_teams_division_conference_id', 'teams')
    op.drop_index('ix_teams_league_id', 'teams')
    
    op.drop_index('ix_production_services_production_company_id', 'production_services')
    op.drop_index('ix_production_services_entity_type_entity_id', 'production_services')
    
    op.drop_index('ix_broadcast_rights_entity_type_entity_id', 'broadcast_rights')
    op.drop_index('ix_broadcast_rights_broadcast_company_id', 'broadcast_rights')
    
    op.drop_index('ix_games_season_year', 'games')
    op.drop_index('ix_games_home_team_id', 'games')
    op.drop_index('ix_games_away_team_id', 'games')
    
    op.drop_index('ix_brand_relationships_entity_type_entity_id', 'brand_relationships')
    
    op.drop_index('ix_game_broadcasts_game_id', 'game_broadcasts')
    op.drop_index('ix_game_broadcasts_broadcast_company_id', 'game_broadcasts')
    
    op.drop_index('ix_league_executives_league_id', 'league_executives')
    
    op.drop_index('ix_players_name', 'players')
    
    op.drop_index('ix_team_records_team_id_season_year', 'team_records')
    
    # Drop functional indexes
    op.execute('DROP INDEX IF EXISTS ix_production_services_entity_type_lower')
    op.execute('DROP INDEX IF EXISTS ix_broadcast_rights_entity_type_lower')
    op.execute('DROP INDEX IF EXISTS ix_brand_relationships_entity_type_lower')