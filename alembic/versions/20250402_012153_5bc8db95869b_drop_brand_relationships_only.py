"""drop brand relationships only

Revision ID: 5bc8db95869b
Revises: 59c019e3f9af
Create Date: 2025-04-02 01:21:53

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '5bc8db95869b'
down_revision = '59c019e3f9af'
branch_labels = None
depends_on = None


def upgrade():
    # Only drop brand_relationships table
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
