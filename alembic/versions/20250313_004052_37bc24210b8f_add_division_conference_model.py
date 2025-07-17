"""add_division_conference_model

Revision ID: 37bc24210b8f
Revises: b667cd5de716
Create Date: 2025-03-13 00:40:52.161820+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '37bc24210b8f'
down_revision: Union[str, None] = 'b667cd5de716'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS divisions_conferences (
            id UUID PRIMARY KEY,
            name VARCHAR,
            league_id UUID,
            created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
            updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
        );
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS divisions_conferences;") 