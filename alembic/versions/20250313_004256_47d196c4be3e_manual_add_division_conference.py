"""manual_add_division_conference

Revision ID: 47d196c4be3e
Revises: b667cd5de716
Create Date: 2025-03-13 00:42:56.123456

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '47d196c4be3e'
down_revision: Union[str, None] = 'b667cd5de716'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # This migration was for manual data insertion and is no longer needed.
    # We pass to avoid any errors on existing databases.
    pass


def downgrade() -> None:
    # This migration was for manual data insertion and is no longer needed.
    # We pass to avoid any errors on existing databases.
    pass 