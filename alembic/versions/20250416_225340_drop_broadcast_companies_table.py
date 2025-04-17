
"""Drop broadcast_companies table after migrating to unified Brand model

Revision ID: 20250416_225340_drop_bc
Revises: 
Create Date: 2025-04-16T22:53:40.027518

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20250416_225340_drop_bc'
down_revision = '6f32954b4f3c'  # Set to the current head
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop the broadcast_companies table since we've migrated all references to the brands table
    op.drop_table('broadcast_companies')


def downgrade() -> None:
    # Recreating the broadcast_companies table
    op.create_table('broadcast_companies',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('type', sa.String(), nullable=False),
        sa.Column('website', sa.String(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('logo_url', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('is_exclusive', sa.Boolean(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    # Note: This downgrade won't restore any data that was in the table
    # and won't recreate foreign key references to this table.
    # A full restoration would require additional steps.