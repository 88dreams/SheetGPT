"""add_deleted_at_column

Revision ID: 20250422_225930_add_deleted_at
Revises: a1164ca699f1
Create Date: 2025-04-22 22:59:30.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

# revision identifiers, used by Alembic.
revision = '20250422_225930_add_deleted_at'
down_revision = 'a1164ca699f1'
branch_labels = None
depends_on = None

def upgrade():
    # Add deleted_at column to contacts table
    op.add_column('contacts', sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True))
    
    # Add deleted_at column to contact_brand_associations table
    op.add_column('contact_brand_associations', sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True))

def downgrade():
    # Remove deleted_at column from contact_brand_associations table
    op.drop_column('contact_brand_associations', 'deleted_at')
    
    # Remove deleted_at column from contacts table
    op.drop_column('contacts', 'deleted_at')
