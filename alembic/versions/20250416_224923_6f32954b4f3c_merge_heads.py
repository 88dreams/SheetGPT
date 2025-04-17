"""merge_heads

Revision ID: 6f32954b4f3c
Revises: 5bc8db95869b, 075cd163e448457d80e6fa481a1ed591
Create Date: 2025-04-16 22:49:23.127415+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6f32954b4f3c'
down_revision: Union[str, None] = ('5bc8db95869b', '075cd163e448457d80e6fa481a1ed591')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass 