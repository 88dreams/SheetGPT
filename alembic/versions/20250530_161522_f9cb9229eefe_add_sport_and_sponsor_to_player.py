"""add_sport_and_sponsor_to_player

Revision ID: f9cb9229eefe
Revises: 828c207417ed
Create Date: 2025-05-30 16:15:22.825601+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'f9cb9229eefe'
down_revision: Union[str, None] = '828c207417ed'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE players ADD COLUMN IF NOT EXISTS sport VARCHAR(255);")
    op.execute("ALTER TABLE players ADD COLUMN IF NOT EXISTS sponsor_brand_id UUID;")
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conname = 'fk_players_sponsor_brand_id'
            ) THEN
                ALTER TABLE players
                ADD CONSTRAINT fk_players_sponsor_brand_id
                FOREIGN KEY (sponsor_brand_id) REFERENCES brands(id);
            END IF;
        END;
        $$;
    """)


def downgrade() -> None:
    op.execute("ALTER TABLE players DROP CONSTRAINT IF EXISTS fk_players_sponsor_brand_id;")
    op.execute("ALTER TABLE players DROP COLUMN IF EXISTS sponsor_brand_id;")
    op.execute("ALTER TABLE players DROP COLUMN IF EXISTS sport;") 