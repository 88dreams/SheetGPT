"""add nickname to corporate table

Revision ID: 349ba6524aa3
Revises: 7e5a3f289df7
Create Date: 2025-07-11 22:09:07.504500+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '349ba6524aa3'
down_revision: Union[str, None] = '7e5a3f289df7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE corporates
        ADD COLUMN IF NOT EXISTS nickname VARCHAR(255);
    """)


def downgrade() -> None:
    op.execute("""
        ALTER TABLE corporates
        DROP COLUMN IF EXISTS nickname;
    """) 