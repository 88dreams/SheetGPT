# Database Recovery Process

This document outlines the process used to recover the database after encountering issues with Docker volumes.

## Issue Summary

On April 23, 2025, we encountered an issue where the Docker PostgreSQL database container appeared to be running correctly (627MB image), but had no tables created. The database reported a size of about 7.4MB but contained no application tables.

## Resolution Steps

1. **Diagnosis**:
   - Confirmed PostgreSQL container was running
   - Verified database existed but had no tables (`SELECT count(*) FROM pg_tables WHERE schemaname = 'public'` returned 0)
   - Identified error in logs: `relation "users" does not exist`

2. **Recovery Solution**:
   - Downloaded the production database from Digital Ocean using the `download_from_do.sh` script
   - Restored the database to the local Docker container
   - Verified the restoration was successful (21 tables present)

3. **Docker Environment Cleanup**:
   - Created a backup of the working database (`sheetgpt_backup.dump`)
   - Removed unused volumes (`sheetgpt_pgdata`, `sheetgpt_postgres_data`)
   - Kept only the necessary `postgres-data` volume

## Current Configuration

- The application now uses a single Docker volume for the database: `postgres-data`
- The database contains 21 tables with data from production
- Database size: approximately 7.6MB

## Maintenance Recommendations

1. **Regular Backups**:
   - Run the backup script weekly: `docker exec sheetgpt-db-1 pg_dump -U postgres -d sheetgpt > backups/sheetgpt_backup_$(date +%Y%m%d).dump`
   - Store backups in a separate location

2. **Volume Management**:
   - Avoid creating multiple volumes
   - Use only the named volume defined in docker-compose.yml (`postgres-data`)

3. **Database Initialization**:
   If the database needs to be recreated:
   - Use the provided script: `docker cp init_db.py sheetgpt-backend-1:/app/ && docker exec -it sheetgpt-backend-1 python /app/init_db.py`
   - Or restore from backup: See `restore_db_docker.sh`

## Recovery Commands

```bash
# Download production database from Digital Ocean
./download_from_do.sh

# Manual backup of local database
docker exec sheetgpt-db-1 pg_dump -U postgres -d sheetgpt > sheetgpt_backup.dump

# Check database status
docker exec sheetgpt-db-1 psql -U postgres -c '\l'
docker exec sheetgpt-db-1 psql -U postgres -d sheetgpt -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'"
```
