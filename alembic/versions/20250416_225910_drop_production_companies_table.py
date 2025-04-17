"""Drop production_companies table after migrating to unified Brand model

Revision ID: 20250416_225910_drop_pc
Revises: 20250416_225340_drop_bc
Create Date: 2025-04-16T22:59:10.217318

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20250416_225910_drop_pc'
down_revision = '20250416_225340_drop_bc'  # This should follow the broadcast_companies drop
branch_labels = None
depends_on = None


def upgrade() -> None:
    # First drop the foreign key constraint in game_broadcasts that references production_companies
    op.drop_constraint('game_broadcasts_production_company_id_fkey', 'game_broadcasts', type_='foreignkey')
    
    # Now drop the production_companies table
    op.drop_table('production_companies')


def downgrade() -> None:
    # Recreating the production_companies table
    op.create_table('production_companies',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Recreate the foreign key constraint
    op.create_foreign_key(
        'game_broadcasts_production_company_id_fkey',
        'game_broadcasts', 'production_companies',
        ['production_company_id'], ['id']
    )
    
    # Note: This downgrade won't restore any data that was in the table.
    # A full restoration would require additional data import steps.
