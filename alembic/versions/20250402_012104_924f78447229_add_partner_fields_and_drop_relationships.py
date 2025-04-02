"""add partner fields and drop relationships

Revision ID: 924f78447229
Revises: 
Create Date: 2025-04-02 01:21:04

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '924f78447229'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Add partner fields to brands table
    op.add_column('brands', sa.Column('partner', sa.String(length=255), nullable=True))
    op.add_column('brands', sa.Column('partner_relationship', sa.String(length=255), nullable=True))
    
    # Drop brand_relationships table
    op.drop_table('brand_relationships')


def downgrade():
    # Recreate brand_relationships table
    op.create_table('brand_relationships',
        sa.Column('id', postgresql.UUID(), autoincrement=False, nullable=False),
        sa.Column('brand_id', postgresql.UUID(), autoincrement=False, nullable=False),
        sa.Column('partner_entity_type', sa.VARCHAR(length=50), autoincrement=False, nullable=False),
        sa.Column('partner_entity_id', postgresql.UUID(), autoincrement=False, nullable=True),
        sa.Column('partner_name', sa.VARCHAR(length=255), autoincrement=False, nullable=True),
        sa.Column('relationship_type', sa.VARCHAR(length=50), autoincrement=False, nullable=False),
        sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=False),
        sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=False),
        sa.Column('deleted_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=True),
        sa.ForeignKeyConstraint(['brand_id'], ['brands.id'], name='brand_relationships_brand_id_fkey'),
        sa.PrimaryKeyConstraint('id', name='brand_relationships_pkey')
    )
    
    # Remove partner fields from brands table
    op.drop_column('brands', 'partner_relationship')
    op.drop_column('brands', 'partner')
