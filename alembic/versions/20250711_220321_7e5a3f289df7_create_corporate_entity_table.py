"""create corporate entity table

Revision ID: 7e5a3f289df7
Revises: 3a7eb620db47
Create Date: 2025-07-11 22:03:21.095654+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '7e5a3f289df7'
down_revision: Union[str, None] = '3a7eb620db47'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS corporates (
            id UUID PRIMARY KEY,
            name VARCHAR,
            description TEXT,
            industry VARCHAR,
            headquarters VARCHAR,
            website VARCHAR,
            founded_date DATE,
            tags JSONB DEFAULT '[]',
            created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
            updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
        );
    """)
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS ix_corporates_name ON corporates (name);")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_corporates_name;")
    op.execute("DROP TABLE IF EXISTS corporates;") 