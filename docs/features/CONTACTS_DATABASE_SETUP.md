# Contacts Database Setup

## Overview

This document describes the setup of the contacts-related database tables for SheetGPT's LinkedIn integration feature.
These tables enable the storage and management of professional contacts imported from LinkedIn CSV exports or entered manually.

## Database Tables

The contacts feature relies on two primary tables:

1. **contacts**: Stores basic information about individual contacts
2. **contact_brand_associations**: Links contacts to brands (companies) with relationship details

### Table Structure

#### Contacts Table

```sql
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
```

#### Contact Brand Associations Table

```sql
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
```

## Setup Process

When setting up a new environment or recovering from database issues, the contacts tables can be created using the `add_contacts_tables.py` script. This script provides several advantages:

1. Creates tables directly using raw SQL, bypassing any potential issues with Alembic migrations
2. Checks if tables already exist before attempting to create them
3. Updates the `alembic_version` table to reflect that the relevant migrations have been applied
4. Creates all necessary indexes for optimal performance

### Running the Script

```bash
# Copy the script to the backend container
docker-compose cp add_contacts_tables.py backend:/app/

# Execute the script
docker-compose exec backend python add_contacts_tables.py

# Restart the services to ensure changes take effect
docker-compose restart backend frontend
```

## Alembic Migrations

The following Alembic migrations are involved in setting up the contacts tables:

1. `20250422_005144_add_contacts_tables.py` - Creates the base tables
2. `a1164ca699f1_merge_heads_for_contacts_tables.py` - Merge migration
3. `20250422_225930_add_deleted_at.py` - Adds soft delete functionality

Our setup script marks these migrations as applied in the `alembic_version` table, ensuring proper tracking of the database schema.

## Recovery Process

If you encounter issues with missing contacts tables (indicated by 500 errors when accessing the Contacts page), use the `add_contacts_tables.py` script as described above. This will create the tables without requiring a full migration sequence, which may be problematic if the database was restored from a backup with a different migration history.

## Verification

To verify that the tables were created successfully:

```bash
# Check if the contacts table exists and has the correct structure
docker-compose exec db psql -U postgres -d sheetgpt -c "\d contacts"

# Check if the contact_brand_associations table exists and has the correct structure  
docker-compose exec db psql -U postgres -d sheetgpt -c "\d contact_brand_associations"

# Verify that the migrations are marked as applied
docker-compose exec db psql -U postgres -d sheetgpt -c "SELECT * FROM alembic_version WHERE version_num IN ('20250422_005144', 'a1164ca699f1', '20250422_225930_add_deleted_at')"
```
