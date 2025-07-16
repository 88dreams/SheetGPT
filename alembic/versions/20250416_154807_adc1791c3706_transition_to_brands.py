"""transition_to_brands

This migration transitions the database from using broadcast_companies to using 
the Brand model with company_type="Broadcaster" for all broadcast-related 
foreign keys.

Revision ID: 075cd163e448457d80e6fa481a1ed591
Revises: 
Create Date: 2025-04-16 15:48:07

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import uuid

# revision identifiers, used by Alembic.
revision = '075cd163e448457d80e6fa481a1ed591'
down_revision = None  # Will be replaced by Alembic automatically
branch_labels = None
depends_on = None


def upgrade():
    # Step 1: Check if the broadcast_companies table exists.
    # If not, we can skip the data migration steps as there's nothing to copy.
    # ---------------------------------------------------------------
    conn = op.get_bind()
    result = conn.execute(sa.text("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'broadcast_companies')"))
    table_exists = result.scalar()

    if table_exists:
        print("Found 'broadcast_companies' table, proceeding with data migration.")
        # Step 1.1: Ensure all broadcast_companies have corresponding brands
        # ---------------------------------------------------------------
        # This creates brands for any broadcast_companies that don't have one.
        op.execute('''
        INSERT INTO brands (id, name, industry, company_type, country, created_at, updated_at)
        SELECT bc.id, bc.name, 'Media', 'Broadcaster', bc.country, bc.created_at, bc.updated_at
        FROM broadcast_companies bc
        LEFT JOIN brands b ON bc.id = b.id
        WHERE b.id IS NULL
        ''')
        
        # Step 1.2: Update any broadcast_company_type field values
        # ---------------------------------------------------------------
        # If any brands exist without company_type set, but they have an entry in 
        # broadcast_companies, set their company_type to 'Broadcaster'
        op.execute('''
        UPDATE brands
        SET company_type = 'Broadcaster'
        WHERE id IN (SELECT id FROM broadcast_companies)
        AND (company_type IS NULL OR company_type = '')
        ''')
    else:
        print("'broadcast_companies' table not found, skipping data migration steps.")

    # Step 2: Create temporary tables for foreign key references
    # (These steps can run regardless of whether the source table existed)
    # ---------------------------------------------------------------
    
    # Create temp table for stadium references
    op.execute('''
    CREATE TABLE temp_stadium_broadcaster_refs AS
    SELECT id, host_broadcaster_id FROM stadiums WHERE host_broadcaster_id IS NOT NULL
    ''')
    
    # Create temp table for game_broadcasts references
    op.execute('''
    CREATE TABLE temp_game_broadcasts_refs AS
    SELECT id, broadcast_company_id FROM game_broadcasts WHERE broadcast_company_id IS NOT NULL
    ''')
    
    # Create temp table for broadcast_rights references
    op.execute('''
    CREATE TABLE temp_broadcast_rights_refs AS
    SELECT id, broadcast_company_id FROM broadcast_rights WHERE broadcast_company_id IS NOT NULL
    ''')
    
    # Step 3: Update foreign keys to reference brands directly
    # ---------------------------------------------------------------
    
    # 3.1 Drop constraints from stadiums
    op.execute('ALTER TABLE stadiums DROP CONSTRAINT IF EXISTS stadiums_host_broadcaster_id_fkey')
    
    # 3.2 Drop constraints from game_broadcasts
    op.execute('ALTER TABLE game_broadcasts DROP CONSTRAINT IF EXISTS game_broadcasts_broadcast_company_id_fkey')
    
    # 3.3 Drop constraints from broadcast_rights
    op.execute('ALTER TABLE broadcast_rights DROP CONSTRAINT IF EXISTS broadcast_rights_broadcast_company_id_fkey')
    
    # 3.4 Add new constraints to stadiums
    op.execute('ALTER TABLE stadiums ADD CONSTRAINT stadiums_host_broadcaster_id_fkey FOREIGN KEY (host_broadcaster_id) REFERENCES brands(id)')
    
    # 3.5 Add new constraints to game_broadcasts
    op.execute('ALTER TABLE game_broadcasts ADD CONSTRAINT game_broadcasts_broadcast_company_id_fkey FOREIGN KEY (broadcast_company_id) REFERENCES brands(id)')
    
    # 3.6 Add new constraints to broadcast_rights
    op.execute('ALTER TABLE broadcast_rights ADD CONSTRAINT broadcast_rights_broadcast_company_id_fkey FOREIGN KEY (broadcast_company_id) REFERENCES brands(id)')
    
    # Step 4: Add useful indexes and rename fields for clarity
    # ---------------------------------------------------------------
    
    # 4.1 Add index on brands.company_type if not exists (may already be created)
    op.execute('CREATE INDEX IF NOT EXISTS ix_brands_company_type ON brands(company_type)')
    
    # Step 5: Clean up temporary tables
    # ---------------------------------------------------------------
    op.execute('DROP TABLE temp_stadium_broadcaster_refs')
    op.execute('DROP TABLE temp_game_broadcasts_refs')
    op.execute('DROP TABLE temp_broadcast_rights_refs')
    
    # Note: We're not dropping the broadcast_companies table immediately
    # as it may still be referenced by existing code. It can be dropped
    # in a future migration after the code is updated.


def downgrade():
    # Revert foreign key constraints back to broadcast_companies
    # ---------------------------------------------------------------
    
    # 1. Drop the new constraints
    op.execute('ALTER TABLE stadiums DROP CONSTRAINT IF EXISTS stadiums_host_broadcaster_id_fkey')
    op.execute('ALTER TABLE game_broadcasts DROP CONSTRAINT IF EXISTS game_broadcasts_broadcast_company_id_fkey')
    op.execute('ALTER TABLE broadcast_rights DROP CONSTRAINT IF EXISTS broadcast_rights_broadcast_company_id_fkey')
    
    # 2. Recreate the original constraints
    op.execute('ALTER TABLE stadiums ADD CONSTRAINT stadiums_host_broadcaster_id_fkey FOREIGN KEY (host_broadcaster_id) REFERENCES broadcast_companies(id)')
    op.execute('ALTER TABLE game_broadcasts ADD CONSTRAINT game_broadcasts_broadcast_company_id_fkey FOREIGN KEY (broadcast_company_id) REFERENCES broadcast_companies(id)')
    op.execute('ALTER TABLE broadcast_rights ADD CONSTRAINT broadcast_rights_broadcast_company_id_fkey FOREIGN KEY (broadcast_company_id) REFERENCES broadcast_companies(id)')
    
    # Note: We don't remove the brands or change company_type values during downgrade
