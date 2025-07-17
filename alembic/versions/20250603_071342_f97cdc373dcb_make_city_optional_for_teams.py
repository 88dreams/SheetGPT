"""Make city optional for teams

Revision ID: f97cdc373dcb
Revises: c6bf75f04c69
Create Date: 2025-06-03 07:13:42.810574+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f97cdc373dcb'
down_revision: Union[str, None] = 'c6bf75f04c69'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE teams ALTER COLUMN city DROP NOT NULL;")


def downgrade() -> None:
    op.execute("ALTER TABLE teams ALTER COLUMN city SET NOT NULL;") 