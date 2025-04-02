"""Add partner fields to brand

Revision ID: add_partner_fields_to_brand
Revises: 6502c416a4ba
Create Date: 2025-04-02 01:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_partner_fields_to_brand'
down_revision = '6502c416a4ba'
branch_labels = None
depends_on = None


def upgrade() -> None:
    try:
        # Add partner and partner_relationship fields to brands table
        op.add_column('brands', sa.Column('partner', sa.String(length=100), nullable=True))
        op.add_column('brands', sa.Column('partner_relationship', sa.String(length=100), nullable=True))
    except Exception as e:
        print(f"Error adding columns: {str(e)}")


def downgrade() -> None:
    # Remove partner fields from brands table
    op.drop_column('brands', 'partner_relationship')
    op.drop_column('brands', 'partner')