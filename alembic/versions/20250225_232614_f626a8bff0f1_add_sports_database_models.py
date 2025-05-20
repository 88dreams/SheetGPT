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
    op.create_table('leagues',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('nickname', sa.String(length=20), nullable=True),
        sa.Column('sport', sa.String(length=50), nullable=False),
        sa.Column('country', sa.String(length=100), nullable=False),
        sa.Column('broadcast_start_date', sa.Date(), nullable=True),
        sa.Column('broadcast_end_date', sa.Date(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_leagues'))
    )
    op.create_table('divisions_conferences',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('league_id', sa.UUID(), nullable=False), # FK will be added later
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('nickname', sa.String(length=20), nullable=True),
        sa.Column('type', sa.String(length=50), nullable=False),
        sa.Column('region', sa.String(length=100), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_divisions_conferences'))
    )
    op.create_table('stadiums',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('city', sa.String(length=100), nullable=False),
        sa.Column('state', sa.String(length=100), nullable=True),
        sa.Column('country', sa.String(length=100), nullable=False),
        sa.Column('capacity', sa.Integer(), nullable=True),
        sa.Column('owner', sa.String(length=100), nullable=True),
        sa.Column('naming_rights_holder', sa.String(length=100), nullable=True),
        sa.Column('host_broadcaster', sa.String(length=100), nullable=True),
        sa.Column('host_broadcaster_id', sa.UUID(), nullable=True), # FK will be added later
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_stadiums'))
    )
    op.create_table('brands',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('industry', sa.String(length=100), nullable=False),
        sa.Column('company_type', sa.String(length=50), nullable=True),
        sa.Column('country', sa.String(length=100), nullable=True),
        sa.Column('partner', sa.String(length=100), nullable=True),
        sa.Column('partner_relationship', sa.String(length=100), nullable=True),
        sa.Column('representative_entity_type', sa.String(length=50), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_brands'))
    )
    op.create_table('teams',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('league_id', sa.UUID(), nullable=False), # FK later
        sa.Column('division_conference_id', sa.UUID(), nullable=False), # FK later
        sa.Column('stadium_id', sa.UUID(), nullable=False), # FK later
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('city', sa.String(length=100), nullable=False),
        sa.Column('state', sa.String(length=100), nullable=True),
        sa.Column('country', sa.String(length=100), nullable=False),
        sa.Column('founded_year', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_teams'))
    )
    op.create_table('players',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('team_id', sa.UUID(), nullable=False), # FK later
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('position', sa.String(length=50), nullable=False),
        sa.Column('jersey_number', sa.Integer(), nullable=True),
        sa.Column('college', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_players'))
    )
    op.create_table('games',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('league_id', sa.UUID(), nullable=False), # FK later
        sa.Column('home_team_id', sa.UUID(), nullable=False), # FK later
        sa.Column('away_team_id', sa.UUID(), nullable=False), # FK later
        sa.Column('stadium_id', sa.UUID(), nullable=False), # FK later
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('time', sa.String(length=10), nullable=True),
        sa.Column('home_score', sa.Integer(), nullable=True),
        sa.Column('away_score', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False, default='Scheduled'),
        sa.Column('season_year', sa.Integer(), nullable=False),
        sa.Column('season_type', sa.String(length=50), nullable=False, default='Regular Season'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_games'))
    )
    op.create_table('broadcast_rights',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('entity_type', sa.String(length=50), nullable=False),
        sa.Column('entity_id', sa.UUID(), nullable=False), # Polymorphic, FKs handled by specific types or later logic
        sa.Column('broadcast_company_id', sa.UUID(), nullable=False), # FK later
        sa.Column('division_conference_id', sa.UUID(), nullable=True), # FK later
        sa.Column('territory', sa.String(length=100), nullable=False),
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=False),
        sa.Column('is_exclusive', sa.Boolean(), nullable=False, default=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_broadcast_rights'))
    )
    op.create_table('production_services',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('entity_type', sa.String(length=50), nullable=False),
        sa.Column('entity_id', sa.UUID(), nullable=False), # Polymorphic
        sa.Column('production_company_id', sa.UUID(), nullable=False), # FK later
        sa.Column('service_type', sa.String(length=100), nullable=False),
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=False),
        sa.Column('secondary_brand_id', sa.UUID(), nullable=True), # FK later
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_production_services'))
    )
    op.create_table('team_records',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('team_id', sa.UUID(), nullable=False), # FK later
        sa.Column('season_year', sa.Integer(), nullable=False),
        sa.Column('wins', sa.Integer(), nullable=False, default=0),
        sa.Column('losses', sa.Integer(), nullable=False, default=0),
        sa.Column('ties', sa.Integer(), nullable=False, default=0),
        sa.Column('playoff_result', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_team_records'))
    )
    op.create_table('team_ownerships',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('team_id', sa.UUID(), nullable=False), # FK later
        sa.Column('owner_name', sa.String(length=100), nullable=False),
        sa.Column('ownership_percentage', sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column('acquisition_date', sa.Date(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_team_ownerships'))
    )
    op.create_table('league_executives',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('league_id', sa.UUID(), nullable=False), # FK later
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('position', sa.String(length=100), nullable=False),
        sa.Column('start_date', sa.Date(), nullable=True),
        sa.Column('end_date', sa.Date(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_league_executives'))
    )
    op.create_table('game_broadcasts',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('game_id', sa.UUID(), nullable=False), # FK later
        sa.Column('broadcast_company_id', sa.UUID(), nullable=False), # FK later
        sa.Column('production_company_id', sa.UUID(), nullable=True), # FK later
        sa.Column('broadcast_type', sa.String(length=50), nullable=False),
        sa.Column('territory', sa.String(length=100), nullable=False),
        sa.Column('start_time', sa.String(length=50), nullable=True),
        sa.Column('end_time', sa.String(length=50), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_game_broadcasts'))
    )

def downgrade() -> None:
    op.drop_table('game_broadcasts')
    op.drop_table('league_executives')
    op.drop_table('team_ownerships')
    op.drop_table('team_records')
    op.drop_table('production_services')
    op.drop_table('broadcast_rights')
    op.drop_table('games')
    op.drop_table('players')
    op.drop_table('teams')
    op.drop_table('brands')
    op.drop_table('stadiums')
    op.drop_table('divisions_conferences')
    op.drop_table('leagues') 