"""add_conversation_order_field

Revision ID: b667cd5de716
Revises: add_unique_constraints
Create Date: 2025-03-10 06:25:47.661049+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b667cd5de716'
down_revision: Union[str, None] = 'add_unique_constraints'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE conversations
        ADD COLUMN IF NOT EXISTS "order" INTEGER;
    """)


def downgrade() -> None:
    op.execute("""
        ALTER TABLE conversations
        DROP COLUMN IF EXISTS "order";
    """) 