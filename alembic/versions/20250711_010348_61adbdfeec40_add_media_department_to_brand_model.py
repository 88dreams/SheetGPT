"""Add media_department to Brand model

Revision ID: 61adbdfeec40
Revises: 6ca0792d82f5
Create Date: 2025-07-11 01:03:48.442422+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '61adbdfeec40'
down_revision: Union[str, None] = '6ca0792d82f5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE brands
        ADD COLUMN IF NOT EXISTS media_department VARCHAR(255);
    """)


def downgrade() -> None:
    op.execute("""
        ALTER TABLE brands
        DROP COLUMN IF EXISTS media_department;
    """) 