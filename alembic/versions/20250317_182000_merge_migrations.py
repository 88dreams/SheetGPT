"""merge_migrations

Revision ID: merge_migrations
Revises: add_nickname_to_division_conference, f574bceb9822
Create Date: 2025-03-17 18:20:00.000000+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'merge_migrations'
down_revision: Union[str, None] = None
# Format for multiple heads in Alembic
down_revision = ('div_conf_nickname', 'f574bceb9822')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    pass


def downgrade() -> None:
    pass