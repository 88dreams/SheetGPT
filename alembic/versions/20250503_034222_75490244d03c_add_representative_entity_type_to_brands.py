"""Add representative_entity_type to brands

Revision ID: 75490244d03c
Revises: 20250422_225930_add_deleted_at
Create Date: 2025-05-03 03:42:22.732142+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '75490244d03c'
down_revision: Union[str, None] = '20250422_225930_add_deleted_at'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE brands
        ADD COLUMN IF NOT EXISTS representative_entity_type VARCHAR(50);
    """)


def downgrade() -> None:
    op.execute("""
        ALTER TABLE brands
        DROP COLUMN IF EXISTS representative_entity_type;
    """) 