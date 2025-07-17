"""Add tags to core chat models

Revision ID: 66c77d9feb51
Revises: 65d80b0ce0ad
Create Date: 2025-07-06 17:42:03.125493+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '66c77d9feb51'
down_revision: Union[str, None] = '65d80b0ce0ad'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]';")
    op.execute("ALTER TABLE conversations ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]';")
    op.execute("ALTER TABLE messages ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]';")


def downgrade() -> None:
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS tags;")
    op.execute("ALTER TABLE conversations DROP COLUMN IF EXISTS tags;")
    op.execute("ALTER TABLE messages DROP COLUMN IF EXISTS tags;") 