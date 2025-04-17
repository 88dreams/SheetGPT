# Brand Migration Plan

## Overview

This document outlines the migration plan for transitioning from separate `BroadcastCompany` and `ProductionCompany` tables to a unified `Brand` model. The migration has been completed locally and needs to be deployed to production environments.

## Migration Steps

### 1. Database Migration

- ✅ **Local**: Created migration scripts (available in alembic/versions/)
- ⬜ **Production**: Apply migrations on the Digital Ocean database

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

```bash
# After migration, verify counts match expected values
python verify_migration.py
```

### 4. Frontend Compatibility

- ✅ **Local**: Tested that API endpoints maintain same response format
- ⬜ **Production**: Deploy frontend to Netlify with updated API expectations

## Deployment Checklist

### Digital Ocean (Backend)

1. Apply database migrations
   ```bash
   python src/scripts/alembic_wrapper.py upgrade head
   ```

2. Deploy updated backend code
   ```bash
   # Via CI/CD pipeline or direct deployment
   git push origin main
   ```

3. Verify API endpoints return expected data
   ```bash
   curl -H "Authorization: Bearer $TOKEN" https://api.88gpts.com/api/v1/sports/broadcast-companies
   curl -H "Authorization: Bearer $TOKEN" https://api.88gpts.com/api/v1/sports/production-companies
   curl -H "Authorization: Bearer $TOKEN" https://api.88gpts.com/api/v1/sports/brands
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