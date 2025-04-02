"""merge brand relationship migrations

Revision ID: 59c019e3f9af
Revises: 8698d962b713, 924f78447229
Create Date: 2025-04-02 01:21:35.772710+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '59c019e3f9af'
down_revision: Union[str, None] = ('8698d962b713', '924f78447229')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass 