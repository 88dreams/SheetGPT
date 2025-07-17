"""add_league_nickname_field

Revision ID: dd64f60a5e18
Revises: c1b2744b8cdf
Create Date: 2025-03-13 18:35:11.123456

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'dd64f60a5e18'
down_revision: Union[str, None] = 'c1b2744b8cdf'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE leagues ADD COLUMN IF NOT EXISTS nickname VARCHAR(255);")


def downgrade() -> None:
    op.execute("ALTER TABLE leagues DROP COLUMN IF EXISTS nickname;") 