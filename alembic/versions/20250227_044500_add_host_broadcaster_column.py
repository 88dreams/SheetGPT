"""Add host_broadcaster column to stadiums table

Revision ID: add_host_broadcaster
Revises: 12cfdc5c6215
Create Date: 2025-02-27 04:45:00.123456+00:00 # Placeholder date

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_host_broadcaster' # This revision ID looks non-standard, might cause issues if not unique
down_revision: Union[str, None] = '12cfdc5c6215'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE stadiums
        ADD COLUMN IF NOT EXISTS host_broadcaster_id UUID;
    """)


def downgrade() -> None:
    op.execute("""
        ALTER TABLE stadiums
        DROP COLUMN IF EXISTS host_broadcaster_id;
    """) 