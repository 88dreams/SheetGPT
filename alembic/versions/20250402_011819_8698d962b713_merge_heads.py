"""merge_heads

Revision ID: 8698d962b713
Revises: a655f60d95bb, drop_brand_relationships_table
Create Date: 2025-04-02 01:18:19.087424+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8698d962b713'
down_revision: Union[str, None] = ('a655f60d95bb', 'drop_brand_relationships_table')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass 