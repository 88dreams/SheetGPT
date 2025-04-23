#!/usr/bin/env python3
"""
Script to add contacts tables to the database.
This script creates the contacts and contact_brand_associations tables directly,
bypassing the problematic migrations.
"""

import asyncio
import sys
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import text

# Add the current directory to the path so we can import from src
sys.path.append(".")

from src.utils.database import engine, AsyncSessionLocal

async def create_tables():
    """Create the contacts-related tables using raw SQL."""
    print("Creating contacts tables...")
    
    # Check if tables already exist
    async with engine.connect() as conn:
        # Check if contacts table exists
        contacts_exists = await conn.scalar(
            text("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'contacts')")
        )
        
        # Check if contact_brand_associations table exists
        associations_exists = await conn.scalar(
            text("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'contact_brand_associations')")
        )
    
    if contacts_exists and associations_exists:
        print("Contacts tables already exist.")
        return
    
    # Create tables using raw SQL
    async with engine.begin() as conn:
        # Create contacts table if it doesn't exist
        if not contacts_exists:
            await conn.execute(text("""
                CREATE TABLE contacts (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    user_id UUID NOT NULL REFERENCES users(id),
                    first_name VARCHAR(100) NOT NULL,
                    last_name VARCHAR(100) NOT NULL,
                    email VARCHAR(255),
                    linkedin_url VARCHAR(255),
                    company VARCHAR(100),
                    position VARCHAR(100),
                    connected_on DATE,
                    notes TEXT,
                    deleted_at TIMESTAMP WITH TIME ZONE,
                    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
                    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now()
                )
            """))
            
            # Create indexes for contacts table
            await conn.execute(text("CREATE INDEX ix_contacts_first_name ON contacts(first_name)"))
            await conn.execute(text("CREATE INDEX ix_contacts_last_name ON contacts(last_name)"))
            await conn.execute(text("CREATE INDEX ix_contacts_email ON contacts(email)"))
            await conn.execute(text("CREATE INDEX ix_contacts_company ON contacts(company)"))
            await conn.execute(text("CREATE INDEX ix_contacts_user_id ON contacts(user_id)"))
            
            print("Created contacts table.")
        
        # Create contact_brand_associations table if it doesn't exist
        if not associations_exists:
            await conn.execute(text("""
                CREATE TABLE contact_brand_associations (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    contact_id UUID NOT NULL REFERENCES contacts(id),
                    brand_id UUID NOT NULL REFERENCES brands(id),
                    confidence_score FLOAT NOT NULL DEFAULT 1.0,
                    association_type VARCHAR(50) NOT NULL DEFAULT 'employed_at',
                    start_date DATE,
                    end_date DATE,
                    is_current BOOLEAN NOT NULL DEFAULT true,
                    is_primary BOOLEAN NOT NULL DEFAULT true,
                    deleted_at TIMESTAMP WITH TIME ZONE,
                    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
                    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
                    CONSTRAINT uq_contact_brand UNIQUE (contact_id, brand_id)
                )
            """))
            
            # Create indexes for contact_brand_associations table
            await conn.execute(text("CREATE INDEX ix_contact_brand_associations_contact_id ON contact_brand_associations(contact_id)"))
            await conn.execute(text("CREATE INDEX ix_contact_brand_associations_brand_id ON contact_brand_associations(brand_id)"))
            
            print("Created contact_brand_associations table.")
    
    print("Tables created successfully.")
    
    # Update alembic_version table to mark these migrations as applied
    async with AsyncSessionLocal() as session:
        session: AsyncSession
        
        # Check if the migration IDs are already in the alembic_version table
        contacts_migration = await session.scalar(
            text("SELECT EXISTS (SELECT 1 FROM alembic_version WHERE version_num = '20250422_005144')")
        )
        
        deleted_at_migration = await session.scalar(
            text("SELECT EXISTS (SELECT 1 FROM alembic_version WHERE version_num = '20250422_225930_add_deleted_at')")
        )
        
        merge_migration = await session.scalar(
            text("SELECT EXISTS (SELECT 1 FROM alembic_version WHERE version_num = 'a1164ca699f1')")
        )
        
        # Add migration IDs to alembic_version if they don't exist
        if not contacts_migration:
            await session.execute(
                text("INSERT INTO alembic_version (version_num) VALUES ('20250422_005144')")
            )
            print("Marked contacts tables migration as applied.")
        
        if not merge_migration:
            await session.execute(
                text("INSERT INTO alembic_version (version_num) VALUES ('a1164ca699f1')")
            )
            print("Marked merge migration as applied.")
        
        if not deleted_at_migration:
            await session.execute(
                text("INSERT INTO alembic_version (version_num) VALUES ('20250422_225930_add_deleted_at')")
            )
            print("Marked deleted_at migration as applied.")
        
        await session.commit()
    
    print("Migration tracking updated successfully.")

if __name__ == "__main__":
    asyncio.run(create_tables())