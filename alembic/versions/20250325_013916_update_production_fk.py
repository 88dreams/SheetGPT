"""Update production service foreign key

Revision ID: update_production_fk
Revises: div_conf_nickname
Create Date: 2025-03-25

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import uuid

# revision identifiers, used by Alembic.
revision = 'update_production_fk'
down_revision = 'div_conf_nickname'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Update production service to reference brands instead of production companies."""
    
    # Step 1: Create temporary column
    op.add_column('production_services', sa.Column('brand_id', postgresql.UUID(as_uuid=True), nullable=True))
    
    # Step 2: Copy data from production_company_id to brand_id
    op.execute("""
        UPDATE production_services
        SET brand_id = production_company_id
    """)
    
    # Step 3: Create Brand entries for any production companies that don't have matching Brand records
    op.execute("""
        INSERT INTO brands (id, name, industry, company_type, country, created_at, updated_at)
        SELECT pc.id, pc.name, 'Production', 'Production Company', 'Unknown', NOW(), NOW()
        FROM production_companies pc
        LEFT JOIN brands b ON pc.id = b.id
        WHERE b.id IS NULL
    """)
    
    # Step 4: Make brand_id column non-nullable
    op.alter_column('production_services', 'brand_id', nullable=False)
    
    # Step 5: Drop old foreign key constraint
    op.drop_constraint(
        'production_services_production_company_id_fkey',
        'production_services',
        type_='foreignkey'
    )
    
    # Step 6: Create new foreign key constraint
    op.create_foreign_key(
        'fk_production_services_brand_id',
        'production_services', 'brands',
        ['brand_id'], ['id']
    )
    
    # Step 7: Drop old column
    op.drop_column('production_services', 'production_company_id')
    
    # Step 8: Rename brand_id to production_company_id
    op.alter_column('production_services', 'brand_id', new_column_name='production_company_id')
    
    # Step 9: Re-create the foreign key with new relationship but same column name
    op.create_foreign_key(
        'production_services_production_company_id_fkey',
        'production_services', 'brands',
        ['production_company_id'], ['id']
    )


def downgrade() -> None:
    """Revert production service to reference production companies."""
    
    # Step 1: Drop the foreign key constraint to brands
    op.drop_constraint(
        'production_services_production_company_id_fkey',
        'production_services',
        type_='foreignkey'
    )
    
    # Step 2: Create temporary column
    op.add_column('production_services', sa.Column('orig_company_id', postgresql.UUID(as_uuid=True), nullable=True))
    
    # Step 3: Make sure all production companies exist
    op.execute("""
        INSERT INTO production_companies (id, name, created_at, updated_at)
        SELECT b.id, b.name, NOW(), NOW()
        FROM brands b
        LEFT JOIN production_companies pc ON b.id = pc.id
        WHERE pc.id IS NULL
        AND b.id IN (SELECT production_company_id FROM production_services)
    """)
    
    # Step 4: Copy data
    op.execute("""
        UPDATE production_services
        SET orig_company_id = production_company_id
    """)
    
    # Step 5: Drop production_company_id column
    op.drop_column('production_services', 'production_company_id')
    
    # Step 6: Add production_company_id column referring to production_companies
    op.add_column('production_services', sa.Column('production_company_id', postgresql.UUID(as_uuid=True), nullable=True))
    
    # Step 7: Copy data back
    op.execute("""
        UPDATE production_services
        SET production_company_id = orig_company_id
    """)
    
    # Step 8: Make production_company_id non-nullable
    op.alter_column('production_services', 'production_company_id', nullable=False)
    
    # Step 9: Create foreign key constraint to production_companies
    op.create_foreign_key(
        'production_services_production_company_id_fkey',
        'production_services', 'production_companies',
        ['production_company_id'], ['id']
    )
    
    # Step 10: Drop temporary column
    op.drop_column('production_services', 'orig_company_id')