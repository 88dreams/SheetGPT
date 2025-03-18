"""add_nickname_to_division_conference

Revision ID: add_nickname_to_division_conference
Revises: dd64f60a5e18
Create Date: 2025-03-17 18:11:57.000000+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'div_conf_nickname'
down_revision: Union[str, None] = 'dd64f60a5e18'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add nickname column to divisions_conferences table
    op.add_column('divisions_conferences', sa.Column('nickname', sa.String(20), nullable=True))
    op.create_index('ix_divisions_conferences_nickname', 'divisions_conferences', ['nickname'])


def downgrade() -> None:
    # Remove nickname column from divisions_conferences table
    op.drop_index('ix_divisions_conferences_nickname', table_name='divisions_conferences')
    op.drop_column('divisions_conferences', 'nickname')