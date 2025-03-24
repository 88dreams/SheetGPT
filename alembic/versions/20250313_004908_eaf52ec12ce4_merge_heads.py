"""merge_heads

Revision ID: eaf52ec12ce4
Revises: 37bc24210b8f, 47d196c4be3e
Create Date: 2025-03-13 00:49:08.586516+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'eaf52ec12ce4'
down_revision: Union[str, None] = ('37bc24210b8f', '47d196c4be3e')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass 