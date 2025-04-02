"""add_partner_fields_to_brand

Revision ID: a655f60d95bb
Revises: 6502c416a4ba
Create Date: 2025-04-02 01:04:04.608299+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'a655f60d95bb'
down_revision: Union[str, None] = '6502c416a4ba'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    try:
        # Add partner and partner_relationship fields to brands table
        op.add_column('brands', sa.Column('partner', sa.String(length=100), nullable=True))
        op.add_column('brands', sa.Column('partner_relationship', sa.String(length=100), nullable=True))
    except Exception as e:
        print(f"Error adding partner fields to brands table: {str(e)}")
    

def downgrade() -> None:
    # Remove the partner fields from brands table
    try:
        op.drop_column('brands', 'partner_relationship')
        op.drop_column('brands', 'partner')
    except Exception as e:
        print(f"Error removing partner fields from brands table: {str(e)}")