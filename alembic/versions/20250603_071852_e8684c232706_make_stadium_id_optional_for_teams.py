"""Make stadium_id optional for teams

Revision ID: e8684c232706
Revises: f97cdc373dcb
Create Date: 2025-06-03 07:18:52.271504+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e8684c232706'
down_revision: Union[str, None] = 'f97cdc373dcb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE teams ALTER COLUMN stadium_id DROP NOT NULL;")


def downgrade() -> None:
    op.execute("ALTER TABLE teams ALTER COLUMN stadium_id SET NOT NULL;") 