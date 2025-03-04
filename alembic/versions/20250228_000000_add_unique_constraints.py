"""Add unique constraints for stadium, league, and team names

Revision ID: add_unique_constraints
Revises: cleanup_duplicates
Create Date: 2025-02-28 00:00:00.000000+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_unique_constraints'
down_revision: Union[str, None] = 'cleanup_duplicates'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add unique constraints
    op.create_unique_constraint('uq_stadiums_name', 'stadiums', ['name'])
    op.create_unique_constraint('uq_leagues_name', 'leagues', ['name'])
    op.create_unique_constraint('uq_teams_name', 'teams', ['name'])

    # Create indexes for better query performance
    op.create_index('ix_stadiums_name', 'stadiums', ['name'])
    op.create_index('ix_leagues_name', 'leagues', ['name'])
    op.create_index('ix_teams_name', 'teams', ['name'])


def downgrade() -> None:
    # Remove indexes first
    op.drop_index('ix_stadiums_name')
    op.drop_index('ix_leagues_name')
    op.drop_index('ix_teams_name')

    # Then remove unique constraints
    op.drop_constraint('uq_stadiums_name', 'stadiums')
    op.drop_constraint('uq_leagues_name', 'leagues')
    op.drop_constraint('uq_teams_name', 'teams') 