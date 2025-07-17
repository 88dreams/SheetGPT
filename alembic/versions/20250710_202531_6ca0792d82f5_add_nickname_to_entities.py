"""add nickname to entities

Revision ID: 6ca0792d82f5
Revises: 66c77d9feb51
Create Date: 2025-07-10 20:25:31.949775+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6ca0792d82f5'
down_revision: Union[str, None] = '66c77d9feb51'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""ALTER TABLE leagues ADD COLUMN IF NOT EXISTS nickname VARCHAR(255);""")
    op.execute("""ALTER TABLE teams ADD COLUMN IF NOT EXISTS nickname VARCHAR(255);""")
    op.execute("""ALTER TABLE players ADD COLUMN IF NOT EXISTS nickname VARCHAR(255);""")
    op.execute("""ALTER TABLE stadiums ADD COLUMN IF NOT EXISTS nickname VARCHAR(255);""")
    op.execute("""ALTER TABLE brands ADD COLUMN IF NOT EXISTS nickname VARCHAR(255);""")


def downgrade() -> None:
    op.execute("""ALTER TABLE leagues DROP COLUMN IF EXISTS nickname;""")
    op.execute("""ALTER TABLE teams DROP COLUMN IF EXISTS nickname;""")
    op.execute("""ALTER TABLE players DROP COLUMN IF EXISTS nickname;""")
    op.execute("""ALTER TABLE stadiums DROP COLUMN IF EXISTS nickname;""")
    op.execute("""ALTER TABLE brands DROP COLUMN IF EXISTS nickname;""") 