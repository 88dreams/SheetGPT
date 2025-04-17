# Brand Migration Plan

## Overview

This document outlines the migration plan for transitioning from separate `BroadcastCompany` and `ProductionCompany` tables to a unified `Brand` model. The migration has been completed locally and needs to be deployed to production environments.

## Migration Steps

### 1. Database Migration

- ✅ **Local**: Created migration scripts (available in alembic/versions/)
- ⬜ **Production**: Apply migrations on the Digital Ocean database

The migration involves the following Alembic scripts:

1. `20250416_154807_adc1791c3706_transition_to_brands.py`
   - Ensures all broadcast_companies have corresponding brands
   - Updates company_type to 'Broadcaster' for existing brands
   - Creates temporary tables to track foreign key references
   - Updates foreign key constraints to point to brands table
   - Adds index on brands.company_type

2. `20250416_224923_6f32954b4f3c_merge_heads.py`
   - Merges migration branches for consistent upgrade path

3. `20250416_225340_drop_broadcast_companies_table.py`
   - Drops the legacy broadcast_companies table after migrating data

4. `20250416_225910_drop_production_companies_table.py`
   - Drops foreign key constraints in game_broadcasts
   - Drops the legacy production_companies table

Run the migrations in order:

```bash
# Run on production server or via CI/CD pipeline
python src/scripts/alembic_wrapper.py upgrade head
```

### 2. Code Changes

- ✅ **Local**: Updated services to use unified Brand model
  - `BroadcastCompanyService` now uses Brand with company_type='Broadcaster'
  - `ProductionCompanyService` now uses Brand with company_type='Production Company'
  - Updated validators to check proper Brand instances
  - API endpoints maintain backwards compatibility

- ⬜ **Production**: Deploy backend code changes to Digital Ocean

### 3. Data Migration

- ✅ **Local**: Tested data transformation from separate company tables to unified Brand table
- ⬜ **Production**: Verify data migration completed correctly

The data migration process is handled automatically by the Alembic migration scripts:

1. **Data Transformation**:
   - All existing broadcast_companies will be copied to the brands table with company_type='Broadcaster'
   - All existing production_companies will be copied to the brands table with company_type='Production Company'
   - Relationships in other tables (broadcast_rights, game_broadcasts, etc.) will be preserved but will point to records in the brands table

2. **Foreign Key Updates**:
   - Foreign keys that previously pointed to broadcast_companies or production_companies will be updated to point to brands
   - This includes stadiums.host_broadcaster_id, game_broadcasts.broadcast_company_id, broadcast_rights.broadcast_company_id, etc.

3. **Verification**:
   Run this verification query after migration to ensure data integrity:

```sql
-- Check that all broadcaster brands exist and have correct type
SELECT COUNT(*) FROM brands WHERE company_type = 'Broadcaster';

-- Check that all production company brands exist and have correct type  
SELECT COUNT(*) FROM brands WHERE company_type = 'Production Company';

-- Check that broadcast rights point to valid brands
SELECT COUNT(*) 
FROM broadcast_rights br
LEFT JOIN brands b ON br.broadcast_company_id = b.id
WHERE b.id IS NULL;
```

You can also run the verification script:

```bash
# After migration, verify counts match expected values
python verify_migration.py
```

### 4. Frontend Compatibility

- ✅ **Local**: Tested that API endpoints maintain same response format
- ⬜ **Production**: Deploy frontend to Netlify with updated API expectations

## Deployment Checklist

### Digital Ocean (Backend)

1. **Backup the Database** (CRITICAL)
   ```bash
   # Create a full database backup before migration
   pg_dump -U postgres -d sheetgpt -f pre_brand_migration_backup.sql
   ```

2. **Apply Database Migrations**
   ```bash
   # Run all migrations to upgrade to the latest schema
   python src/scripts/alembic_wrapper.py upgrade head
   ```

3. **Verify Data Migration**
   ```bash
   # Run SQL queries to verify data integrity
   psql -U postgres -d sheetgpt -c "SELECT COUNT(*) FROM brands WHERE company_type = 'Broadcaster';"
   psql -U postgres -d sheetgpt -c "SELECT COUNT(*) FROM brands WHERE company_type = 'Production Company';"
   
   # Check for orphaned foreign keys
   psql -U postgres -d sheetgpt -c "SELECT COUNT(*) FROM broadcast_rights br LEFT JOIN brands b ON br.broadcast_company_id = b.id WHERE b.id IS NULL;"
   psql -U postgres -d sheetgpt -c "SELECT COUNT(*) FROM game_broadcasts gb LEFT JOIN brands b ON gb.broadcast_company_id = b.id WHERE b.id IS NULL;"
   ```

4. **Deploy Updated Backend Code**
   ```bash
   # Via CI/CD pipeline or direct deployment
   git push origin main
   ```

5. **Verify API Endpoints**
   ```bash
   # Test the API endpoints for both backward compatibility and new functionality
   curl -H "Authorization: Bearer $TOKEN" https://api.88gpts.com/api/v1/sports/broadcast-companies
   curl -H "Authorization: Bearer $TOKEN" https://api.88gpts.com/api/v1/sports/production-companies
   curl -H "Authorization: Bearer $TOKEN" https://api.88gpts.com/api/v1/sports/brands
   ```

6. **Check Backend Logs for Errors**
   ```bash
   # Monitor the application logs for any errors
   tail -f /var/log/sheetgpt/app.log
   ```

### Netlify (Frontend)

1. Deploy updated frontend code
   ```bash
   # Via Netlify CI/CD
   git push origin main
   ```

2. Verify frontend is correctly displaying data from unified Brand model

## Rollback Plan

If issues are encountered during deployment, the following rollback steps should be taken:

1. Revert to previous database migration
   ```bash
   python src/scripts/alembic_wrapper.py downgrade -1
   ```

2. Revert code changes
   ```bash
   git revert <commit-hash>
   ```

3. Redeploy previous version to Digital Ocean and Netlify

## Testing Verification

After deployment, run the following tests to verify the migration was successful:

```bash
# 1. Test basic API endpoints
python test_api_endpoints.py

# 2. Test broadcast rights functionality with Brand model
python test_broadcast_rights.py
```

## Additional Notes

- The migration maintains backward compatibility with existing API endpoints
- No frontend changes should be required as the response format is preserved
- Performance may improve due to fewer joins and simplified data model
- New company types can be added by simply using different company_type values