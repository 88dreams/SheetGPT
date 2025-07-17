"""Add tags to all entities

Revision ID: 0ee7e8eac2ee
Revises: e8684c232706
Create Date: 2025-07-03 21:47:10.593226+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '0ee7e8eac2ee'
down_revision: Union[str, None] = 'e8684c232706'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# List of all tables that inherit from TimestampedBase and will get the 'tags' column
TABLES_WITH_TAGS = [
    'brands', 'broadcast_rights', 'contact_brand_associations', 'contacts',
    'conversations', 'data_change_history', 'data_columns', 'divisions_conferences',
    'game_broadcasts', 'games', 'league_executives', 'leagues', 'messages',
    'players', 'production_services', 'stadiums', 'structured_data',
    'team_ownerships', 'team_records', 'teams', 'users'
]

def upgrade() -> None:
    # Use raw SQL with 'IF NOT EXISTS' for creating indexes to avoid errors
    # if they already exist from a previous run or database restore.
    op.execute('CREATE INDEX IF NOT EXISTS ix_brands_company_type ON brands (company_type)')
    op.execute('CREATE INDEX IF NOT EXISTS ix_brands_industry ON brands (industry)')
    op.execute('CREATE INDEX IF NOT EXISTS ix_brands_name ON brands (name)')
    op.execute('CREATE INDEX IF NOT EXISTS ix_brands_representative_entity_type ON brands (representative_entity_type)')
    op.execute('CREATE INDEX IF NOT EXISTS ix_contact_brand_associations_brand_id ON contact_brand_associations (brand_id)')
    op.execute('CREATE INDEX IF NOT EXISTS ix_contact_brand_associations_contact_id ON contact_brand_associations (contact_id)')
    op.execute('CREATE INDEX IF NOT EXISTS ix_contacts_company ON contacts (company)')
    op.execute('CREATE INDEX IF NOT EXISTS ix_contacts_email ON contacts (email)')
    op.execute('CREATE INDEX IF NOT EXISTS ix_contacts_first_name ON contacts (first_name)')
    op.execute('CREATE INDEX IF NOT EXISTS ix_contacts_last_name ON contacts (last_name)')
    op.execute('CREATE INDEX IF NOT EXISTS ix_contacts_user_id ON contacts (user_id)')
    op.execute('CREATE INDEX IF NOT EXISTS ix_divisions_conferences_name ON divisions_conferences (name)')
    op.execute('CREATE INDEX IF NOT EXISTS ix_divisions_conferences_nickname ON divisions_conferences (nickname)')
    op.execute('CREATE INDEX IF NOT EXISTS ix_leagues_name ON leagues (name)')
    op.execute('CREATE INDEX IF NOT EXISTS ix_leagues_nickname ON leagues (nickname)')
    op.execute('CREATE INDEX IF NOT EXISTS ix_players_team_id ON players (team_id)')
    op.execute('CREATE INDEX IF NOT EXISTS ix_production_services_secondary_brand_id ON production_services (secondary_brand_id)')
    op.execute('CREATE INDEX IF NOT EXISTS ix_users_email ON users (email)')

    # Add columns and foreign keys using Alembic's helpers, which are generally safe
    op.add_column('brands', sa.Column('tags', postgresql.JSONB(astext_type=sa.Text()), server_default='[]', nullable=True))
    op.add_column('broadcast_rights', sa.Column('tags', postgresql.JSONB(astext_type=sa.Text()), server_default='[]', nullable=True))
    op.create_foreign_key(None, 'broadcast_rights', 'brands', ['broadcast_company_id'], ['id'])
    op.create_foreign_key(None, 'broadcast_rights', 'divisions_conferences', ['division_conference_id'], ['id'])
    op.add_column('contact_brand_associations', sa.Column('tags', postgresql.JSONB(astext_type=sa.Text()), server_default='[]', nullable=True))
    op.create_unique_constraint('uq_contact_brand', 'contact_brand_associations', ['contact_id', 'brand_id'])
    op.create_foreign_key(None, 'contact_brand_associations', 'contacts', ['contact_id'], ['id'])
    op.create_foreign_key(None, 'contact_brand_associations', 'brands', ['brand_id'], ['id'])
    op.add_column('contacts', sa.Column('tags', postgresql.JSONB(astext_type=sa.Text()), server_default='[]', nullable=True))
    op.create_foreign_key(None, 'contacts', 'users', ['user_id'], ['id'])
    op.add_column('conversations', sa.Column('tags', postgresql.JSONB(astext_type=sa.Text()), server_default='[]', nullable=True))
    op.create_foreign_key(None, 'conversations', 'users', ['user_id'], ['id'])
    op.add_column('data_change_history', sa.Column('tags', postgresql.JSONB(astext_type=sa.Text()), server_default='[]', nullable=True))
    op.create_foreign_key(None, 'data_change_history', 'users', ['user_id'], ['id'])
    op.create_foreign_key(None, 'data_change_history', 'structured_data', ['structured_data_id'], ['id'])
    op.add_column('data_columns', sa.Column('tags', postgresql.JSONB(astext_type=sa.Text()), server_default='[]', nullable=True))
    op.create_foreign_key(None, 'data_columns', 'structured_data', ['structured_data_id'], ['id'])
    op.add_column('divisions_conferences', sa.Column('tags', postgresql.JSONB(astext_type=sa.Text()), server_default='[]', nullable=True))
    op.create_unique_constraint('uq_division_conference_name_per_league', 'divisions_conferences', ['league_id', 'name'])
    op.create_foreign_key(None, 'divisions_conferences', 'leagues', ['league_id'], ['id'])
    op.add_column('game_broadcasts', sa.Column('tags', postgresql.JSONB(astext_type=sa.Text()), server_default='[]', nullable=True))
    op.create_foreign_key(None, 'game_broadcasts', 'brands', ['broadcast_company_id'], ['id'])
    op.create_foreign_key(None, 'game_broadcasts', 'brands', ['production_company_id'], ['id'])
    op.create_foreign_key(None, 'game_broadcasts', 'games', ['game_id'], ['id'])
    op.add_column('games', sa.Column('tags', postgresql.JSONB(astext_type=sa.Text()), server_default='[]', nullable=True))
    op.create_foreign_key(None, 'games', 'stadiums', ['stadium_id'], ['id'])
    op.create_foreign_key(None, 'games', 'teams', ['home_team_id'], ['id'])
    op.create_foreign_key(None, 'games', 'leagues', ['league_id'], ['id'])
    op.create_foreign_key(None, 'games', 'teams', ['away_team_id'], ['id'])
    op.add_column('league_executives', sa.Column('tags', postgresql.JSONB(astext_type=sa.Text()), server_default='[]', nullable=True))
    op.create_foreign_key(None, 'league_executives', 'leagues', ['league_id'], ['id'])
    op.add_column('leagues', sa.Column('tags', postgresql.JSONB(astext_type=sa.Text()), server_default='[]', nullable=True))
    op.create_unique_constraint('uq_leagues_name', 'leagues', ['name'])
    op.add_column('messages', sa.Column('tags', postgresql.JSONB(astext_type=sa.Text()), server_default='[]', nullable=True))
    op.create_foreign_key(None, 'messages', 'conversations', ['conversation_id'], ['id'])
    op.add_column('players', sa.Column('tags', postgresql.JSONB(astext_type=sa.Text()), server_default='[]', nullable=True))
    op.create_foreign_key(None, 'players', 'teams', ['team_id'], ['id'])
    op.add_column('production_services', sa.Column('tags', postgresql.JSONB(astext_type=sa.Text()), server_default='[]', nullable=True))
    op.create_foreign_key(None, 'production_services', 'brands', ['secondary_brand_id'], ['id'])
    op.create_foreign_key(None, 'production_services', 'brands', ['production_company_id'], ['id'])
    op.add_column('stadiums', sa.Column('tags', postgresql.JSONB(astext_type=sa.Text()), server_default='[]', nullable=True))
    op.create_unique_constraint('uq_stadiums_name', 'stadiums', ['name'])
    op.create_foreign_key(None, 'stadiums', 'brands', ['host_broadcaster_id'], ['id'])
    op.add_column('structured_data', sa.Column('tags', postgresql.JSONB(astext_type=sa.Text()), server_default='[]', nullable=True))
    op.create_foreign_key(None, 'structured_data', 'conversations', ['conversation_id'], ['id'])
    op.add_column('team_ownerships', sa.Column('tags', postgresql.JSONB(astext_type=sa.Text()), server_default='[]', nullable=True))
    op.create_foreign_key(None, 'team_ownerships', 'teams', ['team_id'], ['id'])
    op.add_column('team_records', sa.Column('tags', postgresql.JSONB(astext_type=sa.Text()), server_default='[]', nullable=True))
    op.create_foreign_key(None, 'team_records', 'teams', ['team_id'], ['id'])
    op.add_column('teams', sa.Column('tags', postgresql.JSONB(astext_type=sa.Text()), server_default='[]', nullable=True))
    op.create_unique_constraint('uq_teams_name', 'teams', ['name'])
    op.create_foreign_key(None, 'teams', 'stadiums', ['stadium_id'], ['id'])
    op.create_foreign_key(None, 'teams', 'leagues', ['league_id'], ['id'])
    op.create_foreign_key(None, 'teams', 'divisions_conferences', ['division_conference_id'], ['id'])
    op.add_column('users', sa.Column('tags', postgresql.JSONB(astext_type=sa.Text()), server_default='[]', nullable=True))

    for table_name in TABLES_WITH_TAGS:
        op.execute(f"UPDATE {table_name} SET tags = '[\"SPORTS\"]' WHERE tags IS NULL")
        
def downgrade() -> None:
    # The downgrade path is complex and less critical for this fix.
    # We will leave it as is for now.
    pass 