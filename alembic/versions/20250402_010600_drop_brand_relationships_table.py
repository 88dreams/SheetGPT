"""Drop brand relationships table

Revision ID: drop_brand_relationships_table
Revises: add_partner_fields_to_brand
Create Date: 2025-04-02 01:06:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'drop_brand_relationships_table'
down_revision = 'add_partner_fields_to_brand'
branch_labels = None
depends_on = None


def upgrade() -> None:
    try:
        # Drop brand_relationships table
        op.drop_table('brand_relationships')
    except Exception as e:
        print(f"Error dropping brand_relationships table: {str(e)}")


def downgrade() -> None:
    # Recreate brand_relationships table
    op.create_table('brand_relationships',
        sa.Column('id', postgresql.UUID(), nullable=False),
        sa.Column('brand_id', postgresql.UUID(), nullable=False),
        sa.Column('entity_type', sa.String(length=50), nullable=False),
        sa.Column('entity_id', postgresql.UUID(), nullable=False),
        sa.Column('relationship_type', sa.String(length=100), nullable=False),
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['brand_id'], ['brands.id'], ),
        sa.PrimaryKeyConstraint('id')
    )