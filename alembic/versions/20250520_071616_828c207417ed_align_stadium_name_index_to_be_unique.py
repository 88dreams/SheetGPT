"""Align stadium name index to be unique

Revision ID: 828c207417ed
Revises: f65c9e88c6bf
Create Date: 2025-05-20 07:16:16.143604+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '828c207417ed'
down_revision: Union[str, None] = 'f65c9e88c6bf'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop the existing non-unique index if it exists, then create a unique one.
    op.execute('DROP INDEX IF EXISTS ix_stadiums_name')
    op.create_index('ix_stadiums_name', 'stadiums', ['name'], unique=True)

    # Do the same for the teams table.
    op.execute('DROP INDEX IF EXISTS ix_teams_name')
    op.create_index('ix_teams_name', 'teams', ['name'], unique=True)


def downgrade() -> None:
    # Revert to non-unique indexes.
    op.drop_index('ix_teams_name', table_name='teams')
    op.create_index('ix_teams_name', 'teams', ['name'], unique=False)
    
    op.drop_index('ix_stadiums_name', table_name='stadiums')
    op.create_index('ix_stadiums_name', 'stadiums', ['name'], unique=False) 