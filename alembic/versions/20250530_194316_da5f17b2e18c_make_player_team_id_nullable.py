"""make_player_team_id_nullable

Revision ID: da5f17b2e18c
Revises: f9cb9229eefe
Create Date: 2025-05-30 19:43:16.349357+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql # Ensure this is imported for UUID type


# revision identifiers, used by Alembic.
revision: str = 'da5f17b2e18c'
down_revision: Union[str, None] = 'f9cb9229eefe' # This should be the ID of the previous migration
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE players ALTER COLUMN team_id DROP NOT NULL;")


def downgrade() -> None:
    op.execute("ALTER TABLE players ALTER COLUMN team_id SET NOT NULL;") 