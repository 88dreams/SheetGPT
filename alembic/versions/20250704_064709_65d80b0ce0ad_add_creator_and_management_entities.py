"""Add Creator and Management entities

Revision ID: 65d80b0ce0ad
Revises: 0ee7e8eac2ee
Create Date: 2025-07-04 06:47:09.136489+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '65d80b0ce0ad'
down_revision: Union[str, None] = '0ee7e8eac2ee'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS creators (
            id UUID PRIMARY KEY,
            name VARCHAR,
            created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
            updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
        );
    """)
    op.execute("""
        CREATE TABLE IF NOT EXISTS management (
            id UUID PRIMARY KEY,
            name VARCHAR,
            created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
            updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
        );
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS creators;")
    op.execute("DROP TABLE IF EXISTS management;") 