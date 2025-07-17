"""add_sport_to_stadiums

Revision ID: c6bf75f04c69
Revises: da5f17b2e18c
Create Date: 2025-06-02 17:32:53.429905+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
# from sqlalchemy.dialects import postgresql # Not strictly needed for String

# revision identifiers, used by Alembic.
revision: str = 'c6bf75f04c69'
down_revision: Union[str, None] = 'da5f17b2e18c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE stadiums ADD COLUMN IF NOT EXISTS sport VARCHAR(255);")


def downgrade() -> None:
    op.execute("ALTER TABLE stadiums DROP COLUMN IF EXISTS sport;") 