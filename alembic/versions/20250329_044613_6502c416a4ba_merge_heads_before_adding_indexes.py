"""merge heads before adding indexes

Revision ID: 6502c416a4ba
Revises: merge_migrations, 20250328_000000, add_secondary_brand
Create Date: 2025-03-29 04:46:13.154001+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6502c416a4ba'
down_revision: Union[str, None] = ('merge_migrations', '20250328_000000', 'add_secondary_brand')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass 