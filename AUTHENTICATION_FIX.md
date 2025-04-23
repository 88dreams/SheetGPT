# SheetGPT Authentication and Database Fix

This document describes the fixes implemented to resolve authentication and database issues in the SheetGPT project.

## Issues Fixed

### 1. API Communication Issues
The frontend was trying to access the backend using `http://backend:8000`, which works within Docker's internal network but not from a browser.

**Solution:**
- Modified the frontend API client to automatically transform Docker container URLs to browser-accessible URLs
- Updated `frontend/src/utils/apiClient.ts` to replace "http://backend:" with "http://localhost:" in the API_URL

### 2. Missing Database Tables
After fixing the API URL, a "relation 'conversations' does not exist" error was encountered because the database had only the "users" table but was missing all other tables.

**Solution:**
- Created database restoration scripts:
  - `restore_db_docker.sh` - Runs inside the container to restore from a backup
  - `run_restore.sh` - External wrapper to run the restoration from host
  - `download_from_do.sh` - Downloads and restores from Digital Ocean database

## How to Use These Fixes

### API URL Fix
The URL transformation happens automatically in `apiClient.ts`. No manual steps needed.

### Database Restoration
To restore the database:

1. Local backup restoration:
   ```
   ./run_restore.sh
   ```

2. Digital Ocean backup restoration:
   ```
   ./download_from_do.sh
   ```

## Preventing Future Issues

1. **URL Management**
   - Always use environment variables for API URLs, never hardcode them
   - For browser access, use "localhost" or actual domain name
   - For container-to-container, use service names (e.g., "backend")

2. **Database Management**
   - Keep regular database backups
   - Use database migration tools like Alembic for schema changes
   - Test migrations in development before applying to production

## Emergency Recovery

If you need to restore from scratch:

1. Start containers:
   ```
   docker-compose up -d
   ```

2. Restore database:
   ```
   ./run_restore.sh
   ```

3. Verify tables are present:
   ```
   docker-compose exec db psql -U postgres -c "\dt" sheetgpt
   ```

## Files Modified

1. `frontend/src/utils/apiClient.ts` - Modified to handle Docker container URLs
2. Various database scripts created for backup and restoration

The application should now work correctly with authentication and all database functionality.
EOF < /dev/null