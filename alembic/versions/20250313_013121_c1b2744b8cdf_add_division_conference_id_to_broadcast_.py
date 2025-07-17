"""add_division_conference_id_to_broadcast_rights

Revision ID: c1b2744b8cdf
Revises: 97f937ec8e07
Create Date: 2025-03-13 01:31:21.793036+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'c1b2744b8cdf'
down_revision: Union[str, None] = '97f937ec8e07'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE broadcast_rights
        ADD COLUMN IF NOT EXISTS division_conference_id UUID;
    """)
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conname = 'fk_broadcast_rights_division_conference_id'
            ) THEN
                ALTER TABLE broadcast_rights
                ADD CONSTRAINT fk_broadcast_rights_division_conference_id
                FOREIGN KEY (division_conference_id) REFERENCES divisions_conferences(id);
            END IF;
        END;
        $$;
    """)


def downgrade() -> None:
    op.execute("ALTER TABLE broadcast_rights DROP CONSTRAINT IF EXISTS fk_broadcast_rights_division_conference_id;")
    op.execute("ALTER TABLE broadcast_rights DROP COLUMN IF EXISTS division_conference_id;") 