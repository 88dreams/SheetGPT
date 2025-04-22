"""merge_heads_for_linkedin

Revision ID: 170ace92fdc0
Revises: 20250416_225910_drop_pc, 70c8e3a4d5b6
Create Date: 2025-04-20 05:30:47.961735+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '170ace92fdc0'
down_revision: Union[str, None] = ('20250416_225910_drop_pc', '70c8e3a4d5b6')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass 