#!/usr/bin/env python3
"""
Migration script to update broadcast rights to use Brand model directly.
This completes the transition from separate BroadcastCompany model to the unified Brand model.

This script creates an Alembic migration file to:
1. Update foreign key relationships in broadcast_rights
2. Ensure all BroadcastCompany records have corresponding Brand records
3. Update the relationship to point to brands table

Usage:
    python update_broadcast_fk.py
"""

import sys
import os
import re
from datetime import datetime

# Template for the migration file
MIGRATION_TEMPLATE = """\"\"\"Update broadcast rights foreign key

Revision ID: update_broadcast_fk
Revises: update_production_fk
Create Date: {date}

\"\"\"
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import uuid

# revision identifiers, used by Alembic.
revision = 'update_broadcast_fk'
down_revision = 'update_production_fk'
branch_labels = None
depends_on = None


def upgrade() -> None:
    \"\"\"Update broadcast rights to reference brands instead of broadcast companies.\"\"\"
    
    # Step 1: Create temporary column
    op.add_column('broadcast_rights', sa.Column('brand_id', postgresql.UUID(as_uuid=True), nullable=True))
    
    # Step 2: Copy data from broadcast_company_id to brand_id
    op.execute(\"\"\"
        UPDATE broadcast_rights
        SET brand_id = broadcast_company_id
    \"\"\")
    
    # Step 3: Create Brand entries for any broadcast companies that don't have matching Brand records
    op.execute(\"\"\"
        INSERT INTO brands (id, name, industry, company_type, country, created_at, updated_at)
        SELECT bc.id, bc.name, 'Media', 'Broadcaster', bc.country, NOW(), NOW()
        FROM broadcast_companies bc
        LEFT JOIN brands b ON bc.id = b.id
        WHERE b.id IS NULL
    \"\"\")
    
    # Step 4: Make brand_id column non-nullable
    op.alter_column('broadcast_rights', 'brand_id', nullable=False)
    
    # Step 5: Drop old foreign key constraint
    op.drop_constraint(
        'broadcast_rights_broadcast_company_id_fkey',
        'broadcast_rights',
        type_='foreignkey'
    )
    
    # Step 6: Create new foreign key constraint
    op.create_foreign_key(
        'fk_broadcast_rights_brand_id',
        'broadcast_rights', 'brands',
        ['brand_id'], ['id']
    )
    
    # Step 7: Drop old column
    op.drop_column('broadcast_rights', 'broadcast_company_id')
    
    # Step 8: Rename brand_id to broadcast_company_id
    op.alter_column('broadcast_rights', 'brand_id', new_column_name='broadcast_company_id')
    
    # Step 9: Re-create the foreign key with new relationship but same column name
    op.create_foreign_key(
        'broadcast_rights_broadcast_company_id_fkey',
        'broadcast_rights', 'brands',
        ['broadcast_company_id'], ['id']
    )


def downgrade() -> None:
    \"\"\"Revert broadcast rights to reference broadcast companies.\"\"\"
    
    # Step 1: Drop the foreign key constraint to brands
    op.drop_constraint(
        'broadcast_rights_broadcast_company_id_fkey',
        'broadcast_rights',
        type_='foreignkey'
    )
    
    # Step 2: Create temporary column
    op.add_column('broadcast_rights', sa.Column('orig_company_id', postgresql.UUID(as_uuid=True), nullable=True))
    
    # Step 3: Make sure all broadcast companies exist
    op.execute(\"\"\"
        INSERT INTO broadcast_companies (id, name, type, country, created_at, updated_at)
        SELECT b.id, b.name, 'Broadcaster', COALESCE(b.country, 'Unknown'), NOW(), NOW()
        FROM brands b
        LEFT JOIN broadcast_companies bc ON b.id = bc.id
        WHERE bc.id IS NULL
        AND b.id IN (SELECT broadcast_company_id FROM broadcast_rights)
    \"\"\")
    
    # Step 4: Copy data
    op.execute(\"\"\"
        UPDATE broadcast_rights
        SET orig_company_id = broadcast_company_id
    \"\"\")
    
    # Step 5: Drop broadcast_company_id column
    op.drop_column('broadcast_rights', 'broadcast_company_id')
    
    # Step 6: Add broadcast_company_id column referring to broadcast_companies
    op.add_column('broadcast_rights', sa.Column('broadcast_company_id', postgresql.UUID(as_uuid=True), nullable=True))
    
    # Step 7: Copy data back
    op.execute(\"\"\"
        UPDATE broadcast_rights
        SET broadcast_company_id = orig_company_id
    \"\"\")
    
    # Step 8: Make broadcast_company_id non-nullable
    op.alter_column('broadcast_rights', 'broadcast_company_id', nullable=False)
    
    # Step 9: Create foreign key constraint to broadcast_companies
    op.create_foreign_key(
        'broadcast_rights_broadcast_company_id_fkey',
        'broadcast_rights', 'broadcast_companies',
        ['broadcast_company_id'], ['id']
    )
    
    # Step 10: Drop temporary column
    op.drop_column('broadcast_rights', 'orig_company_id')
"""

def create_migration_file():
    """Create the migration file in the alembic versions directory."""
    # Get current date in format YYYYMMDD_HHMMSS
    now = datetime.now()
    date_str = now.strftime("%Y%m%d_%H%M%S")
    
    # Create filename
    filename = f"{date_str}_update_broadcast_fk.py"
    filepath = os.path.join("alembic", "versions", filename)
    
    # Create migration file
    with open(filepath, "w") as f:
        f.write(MIGRATION_TEMPLATE.format(date=now.strftime("%Y-%m-%d %H:%M:%S")))
    
    print(f"Created migration file: {filepath}")
    print("Run the migration with:")
    print("  docker-compose run --rm backend python src/scripts/alembic_wrapper.py upgrade head")

if __name__ == "__main__":
    create_migration_file()