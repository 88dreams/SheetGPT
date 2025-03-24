"""manual_add_division_conference

Revision ID: 47d196c4be3e
Revises: 37bc24210b8f
Create Date: 2025-03-13 00:42:56.523791+00:00

"""
from typing import Sequence, Union
from uuid import uuid4

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


# revision identifiers, used by Alembic.
revision: str = '47d196c4be3e'
down_revision: Union[str, None] = 'b667cd5de716'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create divisions_conferences table
    op.create_table(
        'divisions_conferences',
        sa.Column('id', UUID, primary_key=True, default=uuid4),
        sa.Column('league_id', UUID, sa.ForeignKey('leagues.id'), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('type', sa.String(50), nullable=False),
        sa.Column('region', sa.String(100), nullable=True),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint('league_id', 'name', name='uq_division_conference_name_per_league')
    )
    
    # Create index on name
    op.create_index('ix_divisions_conferences_name', 'divisions_conferences', ['name'])
    
    # Add division_conference_id column to teams
    op.add_column('teams', sa.Column('division_conference_id', UUID, sa.ForeignKey('divisions_conferences.id'), nullable=True))
    
    # Create index on division_conference_id
    op.create_index('ix_teams_division_conference_id', 'teams', ['division_conference_id'])


def downgrade() -> None:
    # Remove index
    op.drop_index('ix_teams_division_conference_id', table_name='teams')
    
    # Remove column from teams
    op.drop_column('teams', 'division_conference_id')
    
    # Drop index
    op.drop_index('ix_divisions_conferences_name', table_name='divisions_conferences')
    
    # Drop table
    op.drop_table('divisions_conferences') 