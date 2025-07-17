"""add notes column to brand

Revision ID: 3a7eb620db47
Revises: 61adbdfeec40
Create Date: 2025-07-11 21:14:55.758454+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3a7eb620db47'
down_revision: Union[str, None] = '61adbdfeec40'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE brands
        ADD COLUMN IF NOT EXISTS notes TEXT;
    """)


def downgrade() -> None:
    op.execute("""
        ALTER TABLE brands
        DROP COLUMN IF EXISTS notes;
    """) 